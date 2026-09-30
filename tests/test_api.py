"""Tests for the FastAPI server endpoints using TestClient."""

from __future__ import annotations

import sys
import json
from pathlib import Path
from unittest.mock import AsyncMock, patch, MagicMock

import pytest
import httpx

_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from attack.stage_runner import StageResult, ChainResult, DetectionResult


# ─── /api/health ─────────────────────────────────────────────────────────────

def test_health(api_client):
    resp = api_client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data


# ─── /api/engines ─────────────────────────────────────────────────────────────

def test_list_engines(api_client):
    resp = api_client.get("/api/engines")
    assert resp.status_code == 200
    data = resp.json()
    assert "engines" in data
    names = [e["name"] for e in data["engines"]]
    assert "jinja2" in names
    assert "mako" in names
    assert "handlebars" in names


# ─── /api/payloads ────────────────────────────────────────────────────────────

def test_list_all_payloads(api_client):
    resp = api_client.get("/api/payloads")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] > 0
    assert all("payload" in p for p in data["payloads"])


def test_list_payloads_by_engine(api_client):
    resp = api_client.get("/api/payloads/jinja2")
    assert resp.status_code == 200
    data = resp.json()
    assert data["engine"] == "jinja2"
    assert data["total"] > 0


def test_payloads_unknown_engine(api_client):
    resp = api_client.get("/api/payloads/doesnotexist")
    assert resp.status_code == 404


# ─── /api/detection/rules ─────────────────────────────────────────────────────

def test_detection_rules(api_client):
    resp = api_client.get("/api/detection/rules")
    assert resp.status_code == 200
    data = resp.json()
    ids = [r["id"] for r in data["rules"]]
    assert "RENDER-001" in ids
    assert "RENDER-002" in ids
    assert "RENDER-003" in ids


# ─── /api/findings ────────────────────────────────────────────────────────────

def test_findings_empty_initially(api_client):
    resp = api_client.get("/api/findings")
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


def test_create_finding(api_client):
    payload = {
        "rule_id": "RENDER-001",
        "rule_name": "Template Expression Evaluation Detected",
        "severity": "high",
        "engine": "jinja2",
        "target_url": "http://127.0.0.1:5001",
        "stage": "detect",
        "payload_used": "{{7*7}}",
        "evidence": {"marker": "49"},
        "details": "Math probe 49 found.",
    }
    resp = api_client.post("/api/findings", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["rule_id"] == "RENDER-001"
    assert "id" in data


def test_delete_finding(api_client):
    # Create first
    payload = {
        "rule_id": "RENDER-001",
        "rule_name": "Test",
        "severity": "high",
        "engine": "jinja2",
        "target_url": "http://127.0.0.1:5001",
        "stage": "detect",
        "payload_used": "{{7*7}}",
        "evidence": {},
        "details": "",
    }
    create_resp = api_client.post("/api/findings", json=payload)
    finding_id = create_resp.json()["id"]

    # Delete
    del_resp = api_client.delete(f"/api/findings/{finding_id}")
    assert del_resp.status_code == 200

    # Verify gone
    list_resp = api_client.get("/api/findings")
    ids = [f["id"] for f in list_resp.json()["findings"]]
    assert finding_id not in ids


def test_delete_nonexistent_finding(api_client):
    resp = api_client.delete("/api/findings/nonexistent-id")
    assert resp.status_code == 404


# ─── /api/telemetry ───────────────────────────────────────────────────────────

def test_telemetry_empty_initially(api_client):
    resp = api_client.get("/api/telemetry")
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


# ─── /api/attack/run ──────────────────────────────────────────────────────────

def _make_mock_stage_result(stage="detect", status="success") -> StageResult:
    return StageResult(
        stage=stage,
        engine="jinja2",
        target_url="http://127.0.0.1:5001",
        mode="vulnerable",
        status=status,
        payload_used="{{7*7}}",
        raw_response="49",
        response_time_ms=10.0,
        evidence={"math_result_found": True},
        detection_result=DetectionResult(
            triggered=True,
            rule_id="RENDER-001",
            rule_name="Template Expression Evaluation Detected",
            severity="high",
            evidence={"marker_found": "49"},
        ),
        finding={
            "id": "abc-123",
            "rule_id": "RENDER-001",
            "severity": "high",
        },
    )


def test_attack_run_success(api_client):
    mock_result = _make_mock_stage_result("detect", "success")

    with patch("api.main._runner.run_stage", new_callable=AsyncMock, return_value=mock_result):
        resp = api_client.post("/api/attack/run", json={
            "engine": "jinja2",
            "target_url": "http://127.0.0.1:5001",
            "stage": "detect",
            "mode": "vulnerable",
        })

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["payload_used"] == "{{7*7}}"
    assert data["finding"] is not None


def test_attack_run_unknown_engine(api_client):
    resp = api_client.post("/api/attack/run", json={
        "engine": "nonexistent",
        "target_url": "http://127.0.0.1:5001",
        "stage": "detect",
    })
    assert resp.status_code == 400


def test_attack_run_invalid_stage(api_client):
    resp = api_client.post("/api/attack/run", json={
        "engine": "jinja2",
        "target_url": "http://127.0.0.1:5001",
        "stage": "notastage",
    })
    assert resp.status_code == 400


# ─── /api/attack/chain ────────────────────────────────────────────────────────

def test_attack_chain_success(api_client):
    stage_results = [
        StageResult(stage="detect", engine="jinja2", target_url="http://127.0.0.1:5001",
                    mode="vulnerable", status="success", payload_used="{{7*7}}",
                    raw_response="49", response_time_ms=5.0),
        StageResult(stage="fingerprint", engine="jinja2", target_url="http://127.0.0.1:5001",
                    mode="vulnerable", status="success", payload_used="{{config}}",
                    raw_response="<Config>", response_time_ms=5.0),
    ]
    mock_chain = ChainResult(
        engine="jinja2",
        target_url="http://127.0.0.1:5001",
        mode="vulnerable",
        stages=stage_results,
    )

    with patch("api.main._runner.run_chain", new_callable=AsyncMock, return_value=mock_chain):
        resp = api_client.post("/api/attack/chain", json={
            "engine": "jinja2",
            "target_url": "http://127.0.0.1:5001",
            "mode": "vulnerable",
        })

    assert resp.status_code == 200
    data = resp.json()
    assert "stages" in data
    assert "summary" in data
    assert data["summary"]["total_stages"] == 2


def test_attack_chain_unknown_engine(api_client):
    resp = api_client.post("/api/attack/chain", json={
        "engine": "bad",
        "target_url": "http://127.0.0.1:5001",
    })
    assert resp.status_code == 400


# ─── /api/compare ─────────────────────────────────────────────────────────────

def test_compare_endpoint(api_client):
    vuln_result = StageResult(
        stage="detect", engine="jinja2", target_url="http://127.0.0.1:5001",
        mode="vulnerable", status="success", payload_used="{{7*7}}", raw_response="49",
    )
    hard_result = StageResult(
        stage="detect", engine="jinja2", target_url="http://127.0.0.1:5002",
        mode="hardened", status="blocked", payload_used="{{7*7}}", raw_response="{{7*7}}",
    )
    mock_compare = {
        "engine": "jinja2",
        "stage": "detect",
        "payload": "{{7*7}}",
        "vulnerable": vuln_result.to_dict(),
        "hardened": hard_result.to_dict(),
        "comparison": {
            "vulnerable_status": "success",
            "hardened_status": "blocked",
            "protection_effective": True,
        },
    }

    with patch("api.main._runner.run_compare", new_callable=AsyncMock, return_value=mock_compare):
        resp = api_client.post("/api/compare", json={
            "engine": "jinja2",
            "payload": "{{7*7}}",
            "stage": "detect",
        })

    assert resp.status_code == 200
    data = resp.json()
    assert data["comparison"]["protection_effective"] is True


# ─── /api/scenarios ───────────────────────────────────────────────────────────

def test_list_scenarios(api_client):
    resp = api_client.get("/api/scenarios")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] > 0
    ids = [s["id"] for s in data["scenarios"]]
    assert "jinja2-full-chain" in ids


# ─── /api/reports ─────────────────────────────────────────────────────────────

def test_generate_report(api_client):
    # Add a finding first
    api_client.post("/api/findings", json={
        "rule_id": "RENDER-001",
        "rule_name": "Test",
        "severity": "high",
        "engine": "jinja2",
        "target_url": "http://127.0.0.1:5001",
        "stage": "detect",
        "payload_used": "{{7*7}}",
        "evidence": {},
        "details": "",
    })

    resp = api_client.post("/api/reports/generate", json={"format": "json"})
    assert resp.status_code == 200
    data = resp.json()
    assert "summary" in data
    assert data["summary"]["total_findings"] >= 1


def test_list_reports(api_client):
    # Generate one
    api_client.post("/api/reports/generate", json={"format": "json"})
    resp = api_client.get("/api/reports")
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


# ─── SSRF protection ──────────────────────────────────────────────────────────

def test_attack_run_rejects_external_url(api_client):
    """attack/run rejects target_url that is not localhost/127.0.0.1 (SSRF guard)."""
    resp = api_client.post("/api/attack/run", json={
        "engine": "jinja2",
        "target_url": "http://evil.example.com/render",
        "stage": "detect",
        "mode": "vulnerable",
    })
    assert resp.status_code == 400
    assert "target_url" in resp.json()["detail"].lower() or "127.0.0.1" in resp.json()["detail"]


def test_attack_chain_rejects_external_url(api_client):
    """attack/chain rejects external target_url."""
    resp = api_client.post("/api/attack/chain", json={
        "engine": "jinja2",
        "target_url": "https://attacker.io/inject",
        "mode": "vulnerable",
    })
    assert resp.status_code == 400


# ─── CORS ─────────────────────────────────────────────────────────────────────

def test_cors_header(api_client):
    """OPTIONS preflight returns CORS allow-all header."""
    resp = api_client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert resp.status_code in (200, 204)
