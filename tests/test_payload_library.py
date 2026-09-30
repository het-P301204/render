"""Tests verifying the YAML payload library loads correctly."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
import yaml

_ROOT = Path(__file__).parent.parent


def _load_payloads(engine: str) -> list[dict]:
    path = _ROOT / "payloads" / f"{engine}.yaml"
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("payloads", [])


ENGINES = ["jinja2", "mako", "handlebars", "nunjucks"]
REQUIRED_STAGES = {"detection", "fingerprinting", "extraction", "escape", "rce"}
REQUIRED_FIELDS = {"id", "name", "stage", "payload", "expected", "explanation", "safety_scope"}


@pytest.mark.parametrize("engine", ENGINES)
def test_payload_file_exists(engine: str):
    path = _ROOT / "payloads" / f"{engine}.yaml"
    assert path.exists(), f"Payload file missing for engine: {engine}"


@pytest.mark.parametrize("engine", ENGINES)
def test_payload_file_parses(engine: str):
    payloads = _load_payloads(engine)
    assert isinstance(payloads, list), f"{engine}: payloads key must be a list"
    assert len(payloads) > 0, f"{engine}: payload list is empty"


@pytest.mark.parametrize("engine", ENGINES)
def test_required_fields_present(engine: str):
    """Every payload has all required fields."""
    payloads = _load_payloads(engine)
    for p in payloads:
        for field in REQUIRED_FIELDS:
            assert field in p, f"{engine} payload '{p.get('id', '?')}' missing field '{field}'"


@pytest.mark.parametrize("engine", ENGINES)
def test_all_stages_covered(engine: str):
    """Each engine covers all 5 attack stages in its payload library."""
    payloads = _load_payloads(engine)
    stages_in_file = {p["stage"] for p in payloads}
    missing = REQUIRED_STAGES - stages_in_file
    assert not missing, (
        f"{engine} payload library missing stages: {missing}"
    )


@pytest.mark.parametrize("engine", ENGINES)
def test_unique_payload_ids(engine: str):
    """Payload IDs are unique within each engine file."""
    payloads = _load_payloads(engine)
    ids = [p["id"] for p in payloads]
    assert len(ids) == len(set(ids)), f"{engine}: duplicate payload IDs found: {ids}"


@pytest.mark.parametrize("engine", ENGINES)
def test_safety_scope_local_only(engine: str):
    """All payloads have safety_scope set to local_lab_only."""
    payloads = _load_payloads(engine)
    for p in payloads:
        assert p.get("safety_scope") == "local_lab_only", (
            f"{engine} payload '{p.get('id')}' has unsafe scope: {p.get('safety_scope')}"
        )


@pytest.mark.parametrize("engine", ENGINES)
def test_payloads_not_empty_strings(engine: str):
    """No payload or expected field is an empty string."""
    payloads = _load_payloads(engine)
    for p in payloads:
        assert p.get("payload", "").strip(), (
            f"{engine} payload '{p.get('id')}' has empty payload string"
        )
        assert p.get("expected", "").strip(), (
            f"{engine} payload '{p.get('id')}' has empty expected string"
        )


def test_jinja2_detection_probe_math():
    """Jinja2 detection payload evaluates to 49."""
    payloads = _load_payloads("jinja2")
    detection = [p for p in payloads if p["stage"] == "detection"]
    math_probes = [p for p in detection if "7*7" in p["payload"]]
    assert math_probes, "Jinja2 must have at least one 7*7 probe"
    assert math_probes[0]["expected"] == "49"


def test_mako_detection_probe_dollar_syntax():
    """Mako detection payloads use ${...} syntax."""
    payloads = _load_payloads("mako")
    detection = [p for p in payloads if p["stage"] == "detection"]
    assert all("${" in p["payload"] for p in detection), (
        "Mako detection payloads should use ${...} syntax"
    )


def test_jinja2_rce_payload_has_popen():
    """Jinja2 RCE payloads reference os.popen."""
    payloads = _load_payloads("jinja2")
    rce = [p for p in payloads if p["stage"] == "rce"]
    assert any("popen" in p["payload"] for p in rce), (
        "Jinja2 RCE payloads should use os.popen"
    )


def test_payload_explanation_not_empty():
    """All payloads have a non-trivial explanation."""
    for engine in ENGINES:
        payloads = _load_payloads(engine)
        for p in payloads:
            assert len(p.get("explanation", "")) > 10, (
                f"{engine} payload '{p.get('id')}' has trivial explanation"
            )
