"""FastAPI server for RENDER SSTI research platform.

Runs on port 8000. Enable CORS for all origins (frontend on 5173).
"""

from __future__ import annotations

import asyncio
import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import uuid4

import httpx
import yaml
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from urllib.parse import urlparse

# Make project root importable when running directly
_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from attack.stage_runner import (
    AttackRunner,
    ChainResult,
    StageResult,
    add_finding,
    delete_finding,
    get_findings,
    get_telemetry,
)
from detection.rules import ALL_RULES
from engines import ALL_ENGINES


# ─── SSRF guard ───────────────────────────────────────────────────────────────

_ALLOWED_HOSTS = {"127.0.0.1", "localhost", "::1"}


def _validate_target_url(url: str) -> None:
    """Raise HTTPException(400) if url is not a local lab URL.

    Uses urlparse to extract the true hostname, preventing SSRF bypasses via
    userinfo-embedded hosts (e.g. http://127.0.0.1@evil.com) which fool simple
    prefix checks. Only 127.0.0.1, localhost, and ::1 are allowed.
    """
    try:
        parsed = urlparse(url)
        host = parsed.hostname or ""
    except Exception:
        host = ""
    if host not in _ALLOWED_HOSTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"target_url must resolve to a local lab server "
                f"(127.0.0.1 / localhost / ::1). "
                f"Received host '{host}' — external URLs are not allowed."
            ),
        )


# ─── In-memory stores ─────────────────────────────────────────────────────────

_telemetry: list[dict] = []
_findings: list[dict] = []

# Use shared stores so CLI and AttackRunner see the same data
_runner = AttackRunner(telemetry_list=_telemetry, findings_list=_findings)


# ─── Lab definitions ─────────────────────────────────────────────────────────

LAB_DEFINITIONS = [
    {
        "id": "jinja2-vulnerable",
        "engine": "jinja2",
        "mode": "vulnerable",
        "url": "http://127.0.0.1:5001",
        "language": "python",
    },
    {
        "id": "jinja2-hardened",
        "engine": "jinja2",
        "mode": "hardened",
        "url": "http://127.0.0.1:5002",
        "language": "python",
    },
    {
        "id": "handlebars-vulnerable",
        "engine": "handlebars",
        "mode": "vulnerable",
        "url": "http://127.0.0.1:3001",
        "language": "javascript",
    },
    {
        "id": "handlebars-hardened",
        "engine": "handlebars",
        "mode": "hardened",
        "url": "http://127.0.0.1:3002",
        "language": "javascript",
    },
    {
        "id": "mako-vulnerable",
        "engine": "mako",
        "mode": "vulnerable",
        "url": "http://127.0.0.1:5003",
        "language": "python",
    },
    {
        "id": "mako-hardened",
        "engine": "mako",
        "mode": "hardened",
        "url": "http://127.0.0.1:5004",
        "language": "python",
    },
]


# ─── Pydantic models ──────────────────────────────────────────────────────────

class AttackRunRequest(BaseModel):
    engine: str
    target_url: str
    stage: str
    payload: Optional[str] = None
    mode: str = "vulnerable"


class ChainRunRequest(BaseModel):
    engine: str
    target_url: str
    mode: str = "vulnerable"


class CompareRequest(BaseModel):
    engine: str
    payload: str
    stage: str
    vulnerable_url: Optional[str] = None
    hardened_url: Optional[str] = None


class ScenarioRunRequest(BaseModel):
    scenario_id: str


class ReportGenerateRequest(BaseModel):
    format: str = "markdown"
    title: Optional[str] = None
    engine: Optional[str] = None
    include_findings: bool = True
    include_telemetry: bool = False


class FindingCreateRequest(BaseModel):
    rule_id: str
    rule_name: str
    severity: str
    engine: str
    target_url: str
    stage: str
    payload_used: str
    evidence: dict = {}
    details: str = ""


# ─── App setup ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield  # startup / shutdown hooks placeholder


app = FastAPI(
    title="RENDER — SSTI Research Platform API",
    description=(
        "Backend API for the RENDER Server-Side Template Injection research platform. "
        "Orchestrates the 5-stage attack chain: DETECT → FINGERPRINT → EXTRACT → ESCAPE → RCE."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "RENDER SSTI Research Platform",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ─── Labs ─────────────────────────────────────────────────────────────────────

async def _check_lab(lab: dict) -> dict:
    result = dict(lab)
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(lab["url"], timeout=3.0)
            result["running"] = resp.status_code < 500
            result["status_code"] = resp.status_code
    except Exception:
        result["running"] = False
        result["status_code"] = None
    return result


@app.get("/api/labs/status")
async def labs_status() -> dict:
    tasks = [_check_lab(lab) for lab in LAB_DEFINITIONS]
    results = await asyncio.gather(*tasks, return_exceptions=False)
    return {
        "labs": list(results),
        "total": len(results),
        "running": sum(1 for r in results if r.get("running")),
    }


# ─── Engines ──────────────────────────────────────────────────────────────────

@app.get("/api/engines")
async def list_engines() -> dict:
    return {
        "engines": [e.to_dict() for e in ALL_ENGINES.values()],
        "total": len(ALL_ENGINES),
    }


# ─── Payloads ─────────────────────────────────────────────────────────────────

def _load_payloads_for_engine(engine_name: str) -> list[dict]:
    payload_file = _ROOT / "payloads" / f"{engine_name}.yaml"
    if not payload_file.exists():
        return []
    with open(payload_file, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("payloads", [])


@app.get("/api/payloads")
async def list_all_payloads() -> dict:
    all_payloads: list[dict] = []
    for engine_name in ALL_ENGINES:
        payloads = _load_payloads_for_engine(engine_name)
        for p in payloads:
            p["engine"] = engine_name
        all_payloads.extend(payloads)
    return {"payloads": all_payloads, "total": len(all_payloads)}


@app.get("/api/payloads/{engine_name}")
async def list_payloads_by_engine(engine_name: str) -> dict:
    if engine_name not in ALL_ENGINES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine '{engine_name}' not found. Available: {list(ALL_ENGINES.keys())}",
        )
    payloads = _load_payloads_for_engine(engine_name)
    return {"engine": engine_name, "payloads": payloads, "total": len(payloads)}


# ─── Detection rules ──────────────────────────────────────────────────────────

@app.get("/api/detection/rules")
async def list_detection_rules() -> dict:
    return {"rules": ALL_RULES, "total": len(ALL_RULES)}


# ─── Findings ─────────────────────────────────────────────────────────────────

@app.get("/api/findings")
async def list_findings() -> dict:
    return {"findings": _findings, "total": len(_findings)}


@app.post("/api/findings", status_code=status.HTTP_201_CREATED)
async def create_finding(req: FindingCreateRequest) -> dict:
    finding = {
        "id": str(uuid4()),
        "rule_id": req.rule_id,
        "rule_name": req.rule_name,
        "severity": req.severity,
        "engine": req.engine,
        "target_url": req.target_url,
        "stage": req.stage,
        "payload_used": req.payload_used,
        "evidence": req.evidence,
        "details": req.details,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    _findings.append(finding)
    return finding


@app.delete("/api/findings/{finding_id}")
async def remove_finding(finding_id: str) -> dict:
    original = len(_findings)
    _findings[:] = [f for f in _findings if f.get("id") != finding_id]
    if len(_findings) == original:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Finding '{finding_id}' not found.",
        )
    return {"deleted": finding_id}


# ─── Telemetry ────────────────────────────────────────────────────────────────

@app.get("/api/telemetry")
async def list_telemetry() -> dict:
    events = list(reversed(_telemetry))
    return {"events": events, "total": len(events)}


# ─── Attack: single stage ─────────────────────────────────────────────────────

@app.post("/api/attack/run")
async def run_attack_stage(req: AttackRunRequest) -> dict:
    _validate_target_url(req.target_url)
    if req.engine not in ALL_ENGINES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown engine '{req.engine}'. Available: {list(ALL_ENGINES.keys())}",
        )
    valid_stages = {"detect", "fingerprint", "extract", "escape", "rce"}
    if req.stage not in valid_stages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid stage '{req.stage}'. Must be one of: {sorted(valid_stages)}",
        )

    engine = ALL_ENGINES[req.engine]
    result: StageResult = await _runner.run_stage(
        engine=engine,
        target_url=req.target_url,
        stage=req.stage,
        payload=req.payload,
        mode=req.mode,
    )

    telemetry_event = None
    if _telemetry:
        telemetry_event = _telemetry[-1]

    return {
        "stage": result.stage,
        "status": result.status,
        "payload_used": result.payload_used,
        "response": result.raw_response,
        "response_time_ms": result.response_time_ms,
        "evidence": result.evidence,
        "telemetry_event": telemetry_event,
        "finding": result.finding,
        "error": result.error,
    }


# ─── Attack: full chain ───────────────────────────────────────────────────────

@app.post("/api/attack/chain")
async def run_attack_chain(req: ChainRunRequest) -> dict:
    _validate_target_url(req.target_url)
    if req.engine not in ALL_ENGINES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown engine '{req.engine}'.",
        )

    engine = ALL_ENGINES[req.engine]
    chain: ChainResult = await _runner.run_chain(
        engine=engine,
        target_url=req.target_url,
        mode=req.mode,
    )
    return chain.to_dict()


# ─── Compare ──────────────────────────────────────────────────────────────────

@app.post("/api/compare")
async def compare_vulnerable_hardened(req: CompareRequest) -> dict:
    if req.engine not in ALL_ENGINES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown engine '{req.engine}'.",
        )

    engine = ALL_ENGINES[req.engine]

    # Fall back to default URLs for the engine
    vuln_url = req.vulnerable_url or engine.default_vulnerable_url
    hard_url = req.hardened_url or engine.default_hardened_url

    # SSRF guard on any caller-supplied URLs
    if req.vulnerable_url:
        _validate_target_url(req.vulnerable_url)
    if req.hardened_url:
        _validate_target_url(req.hardened_url)

    result = await _runner.run_compare(
        engine=engine,
        payload=req.payload,
        stage=req.stage,
        vulnerable_url=vuln_url,
        hardened_url=hard_url,
    )
    return result


# ─── Scenarios ────────────────────────────────────────────────────────────────

def _load_scenarios() -> list[dict]:
    scenario_file = _ROOT / "scenarios" / "scenarios.yaml"
    if not scenario_file.exists():
        return []
    with open(scenario_file, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("scenarios", [])


@app.get("/api/scenarios")
async def list_scenarios() -> dict:
    scenarios = _load_scenarios()
    return {"scenarios": scenarios, "total": len(scenarios)}


@app.post("/api/scenarios/run")
async def run_scenario(req: ScenarioRunRequest) -> dict:
    scenarios = _load_scenarios()
    scenario = next((s for s in scenarios if s["id"] == req.scenario_id), None)
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario '{req.scenario_id}' not found.",
        )

    engine_name = scenario.get("engine", "")
    if engine_name not in ALL_ENGINES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Scenario references unknown engine '{engine_name}'.",
        )

    engine = ALL_ENGINES[engine_name]
    target_url = scenario.get("target_url", engine.default_vulnerable_url)
    mode = scenario.get("mode", "vulnerable")
    stages = scenario.get("stages", [])

    results = []
    for stage in stages:
        result = await _runner.run_stage(
            engine=engine,
            target_url=target_url,
            stage=stage,
            mode=mode,
        )
        results.append(result.to_dict())

    return {
        "scenario_id": scenario["id"],
        "scenario_name": scenario.get("name", ""),
        "engine": engine_name,
        "target_url": target_url,
        "mode": mode,
        "stages_run": results,
        "findings_generated": [r.get("finding") for r in results if r.get("finding")],
    }


# ─── Reports ──────────────────────────────────────────────────────────────────

_reports: list[dict] = []


@app.get("/api/reports")
async def list_reports() -> dict:
    return {"reports": _reports, "total": len(_reports)}


@app.post("/api/reports/generate")
async def generate_report(req: ReportGenerateRequest) -> dict:
    report_id = str(uuid4())
    now = datetime.now(timezone.utc)
    timestamp = now.isoformat()
    readable_date = now.strftime("%B %d, %Y at %H:%M UTC")

    # Filter findings by engine if specified
    scoped_findings = [f for f in _findings if not req.engine or f.get("engine") == req.engine]

    # Aggregate findings by severity
    severity_counts: dict[str, int] = {}
    for f in scoped_findings:
        sev = f.get("severity", "unknown")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    engines_tested = sorted({f.get("engine", "") for f in scoped_findings} - {""})
    stages_covered = sorted({f.get("stage", "") for f in scoped_findings} - {""})
    engine_label = req.engine.upper() if req.engine else "All Engines"
    title = req.title or f"SSTI Research Report — {engine_label}"

    # Build markdown content
    lines: list[str] = [
        f"# RENDER Security Assessment Report",
        f"",
        f"**Generated:** {readable_date}",
        f"**Engine Scope:** {engine_label}",
        f"**Total Findings:** {len(scoped_findings)}",
        f"**Stages Covered:** {', '.join(stages_covered) if stages_covered else 'None'}",
        f"",
        f"---",
        f"",
        f"## Executive Summary",
        f"",
        f"This report covers Server-Side Template Injection (SSTI) vulnerability research "
        f"conducted via the RENDER research platform. "
        + (f"{len(scoped_findings)} finding{'s' if len(scoped_findings) != 1 else ''} confirmed across "
           f"{', '.join(engines_tested)} engine{'s' if len(engines_tested) != 1 else ''}."
           if scoped_findings else "No findings recorded in the current session."),
        f"",
    ]

    if severity_counts:
        lines += ["## Severity Distribution", ""]
        for sev in ["critical", "high", "medium", "low", "info"]:
            if sev in severity_counts:
                lines.append(f"- **{sev.upper()}:** {severity_counts[sev]}")
        lines.append("")

    if req.include_findings and scoped_findings:
        lines += ["## Findings", ""]
        for i, finding in enumerate(scoped_findings, 1):
            lines += [
                f"### Finding {i}: {finding.get('rule_name', finding.get('title', 'Unknown'))}",
                f"",
                f"- **ID:** {finding.get('id', 'N/A')}",
                f"- **Severity:** {finding.get('severity', 'unknown').upper()}",
                f"- **Engine:** {finding.get('engine', 'unknown')}",
                f"- **Stage:** {finding.get('stage', 'unknown')}",
                f"- **Description:** {finding.get('description', 'No description available.')}",
                f"",
            ]
    elif req.include_findings:
        lines += ["## Findings", "", "_No findings recorded in this session._", ""]

    if req.include_telemetry and _telemetry:
        lines += ["## Telemetry Events (last 20)", ""]
        for event in list(reversed(_telemetry))[:20]:
            ts = event.get("timestamp", "")[:19].replace("T", " ")
            lines.append(
                f"- `[{ts}]` **{event.get('event_type', 'event')}** — "
                f"{event.get('engine', '')} / {event.get('stage', '')}"
            )
        lines.append("")

    lines += [
        "---",
        "",
        f"*Generated by RENDER SSTI Research Platform · {readable_date}*",
    ]

    content = "\n".join(lines)
    primary_engine = req.engine or (engines_tested[0] if engines_tested else "jinja2")

    full_report = {
        "id": report_id,
        "title": title,
        "generated_at": timestamp,
        "engine": primary_engine,
        "stage_count": len(stages_covered),
        "finding_count": len(scoped_findings),
        "content": content,
    }

    _reports.append(full_report)
    return full_report


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "api.main:app",
        host="127.0.0.1",  # Bind to loopback only — this is a local research tool
        port=8000,
        reload=True,
        reload_dirs=[str(_ROOT)],
    )
