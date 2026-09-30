"""Tests for detection rules RENDER-001, RENDER-002, RENDER-003."""

from __future__ import annotations

import pytest

from detection.rules import (
    RENDER_001,
    RENDER_002,
    RENDER_003,
    ALL_RULES,
    evaluate_rules,
    DetectionResult,
)


# ─── Rule structure ───────────────────────────────────────────────────────────

def test_all_rules_have_required_fields():
    """Every rule has id, name, description, severity, trigger."""
    required = {"id", "name", "description", "severity", "trigger"}
    for rule in ALL_RULES:
        for field in required:
            assert field in rule, f"Rule {rule.get('id')} missing field '{field}'"


def test_rule_ids():
    """Rules have the expected IDs."""
    ids = {r["id"] for r in ALL_RULES}
    assert "RENDER-001" in ids
    assert "RENDER-002" in ids
    assert "RENDER-003" in ids


def test_render_003_is_critical():
    """RENDER-003 (RCE) must be critical severity."""
    assert RENDER_003["severity"] == "critical"


def test_render_001_is_high():
    assert RENDER_001["severity"] == "high"


def test_render_002_is_high():
    assert RENDER_002["severity"] == "high"


def test_all_rules_have_remediation():
    """All rules include remediation guidance."""
    for rule in ALL_RULES:
        assert "remediation" in rule, f"Rule {rule['id']} missing remediation"
        assert len(rule["remediation"]) > 20


# ─── RENDER-001 evaluation ────────────────────────────────────────────────────

@pytest.mark.parametrize("response,expected_triggered", [
    ("49", True),
    ("42", True),
    ("abcabcabc", True),
    ("{{7*7}}", False),
    ("", False),
    ("random text", False),
])
def test_render_001_triggers(response, expected_triggered):
    """RENDER-001 triggers on math result markers in detect stage."""
    det = evaluate_rules("detect", response, "{{7*7}}", "jinja2")
    assert det.triggered == expected_triggered
    if expected_triggered:
        assert det.rule_id == "RENDER-001"
        assert det.severity == "high"


def test_render_001_not_triggered_in_fingerprint_stage():
    """RENDER-001 only fires in detect stage."""
    det = evaluate_rules("fingerprint", "49", "{{7*7}}", "jinja2")
    # Should trigger RENDER-002 instead (or nothing), not RENDER-001
    if det.triggered:
        assert det.rule_id != "RENDER-001"


# ─── RENDER-002 evaluation ────────────────────────────────────────────────────

@pytest.mark.parametrize("response,engine,expected_triggered", [
    ("<Config {'DEBUG': True}>", "jinja2", True),
    ("TemplateReference", "jinja2", True),
    ("[object Object]", "handlebars", True),
    ("Template", "mako", True),
    ("random text", "jinja2", False),
])
def test_render_002_triggers(response, engine, expected_triggered):
    """RENDER-002 triggers on engine fingerprint markers."""
    det = evaluate_rules("fingerprint", response, "{{config}}", engine)
    assert det.triggered == expected_triggered
    if expected_triggered:
        assert det.rule_id == "RENDER-002"
        assert "engine_identified" in det.evidence


# ─── RENDER-003 evaluation ────────────────────────────────────────────────────

@pytest.mark.parametrize("response,expected_triggered", [
    ("root\n", True),
    ("uid=0(root) gid=0(root)\n", True),
    ("www-data\n", True),
    ("Linux lab 5.15.0 #1 SMP x86_64 GNU/Linux\n", True),
    ("Access Denied", False),
    ("{{payload echoed}}", False),
    ("", False),
])
def test_render_003_triggers(response, expected_triggered):
    """RENDER-003 triggers on command output patterns in rce stage."""
    det = evaluate_rules("rce", response, "{{...}}", "jinja2")
    assert det.triggered == expected_triggered
    if expected_triggered:
        assert det.rule_id == "RENDER-003"
        assert det.severity == "critical"
        assert "command_output_match" in det.evidence


def test_render_003_not_triggered_on_detect_stage():
    """RENDER-003 only fires in rce stage."""
    det = evaluate_rules("detect", "root", "{{7*7}}", "jinja2")
    if det.triggered:
        assert det.rule_id != "RENDER-003"


# ─── DetectionResult structure ────────────────────────────────────────────────

def test_detection_result_default_not_triggered():
    """Default DetectionResult has triggered=False."""
    dr = DetectionResult()
    assert dr.triggered is False
    assert dr.rule_id is None


def test_detection_result_evidence_populated():
    """Evidence dict is populated when a rule fires."""
    det = evaluate_rules("detect", "49", "{{7*7}}", "jinja2")
    assert det.triggered
    assert isinstance(det.evidence, dict)
    assert "marker_found" in det.evidence
