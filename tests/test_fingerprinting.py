"""Tests for the FINGERPRINT attack stage."""

from __future__ import annotations

import pytest
import httpx
from unittest.mock import AsyncMock, patch

from attack.stage_runner import AttackRunner


def _make_mock_client(output: str, url: str = "http://127.0.0.1:5001/render"):
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(
        return_value=httpx.Response(
            200,
            json={"output": output},
            request=httpx.Request("POST", url),
        )
    )
    return mock_client


@pytest.mark.asyncio
async def test_fingerprint_jinja2_config(jinja2_engine):
    """Jinja2 fingerprint stage succeeds when response contains <Config."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(
            return_value=_make_mock_client("<Config {'DEBUG': True}>")
        )
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await runner.run_stage(
            jinja2_engine, "http://127.0.0.1:5001", "fingerprint"
        )

    assert result.status == "success"
    assert result.stage == "fingerprint"
    assert result.detection_result is not None
    assert result.detection_result.rule_id == "RENDER-002"


@pytest.mark.asyncio
async def test_fingerprint_mako_template(mako_engine):
    """Mako fingerprint succeeds when response contains 'Template'."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(
            return_value=_make_mock_client(
                "<class 'mako.runtime.Template'>",
                "http://127.0.0.1:5003/render",
            )
        )
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await runner.run_stage(
            mako_engine, "http://127.0.0.1:5003", "fingerprint"
        )

    assert result.status == "success"


@pytest.mark.asyncio
async def test_fingerprint_hardened_blocked(jinja2_engine):
    """Fingerprint stage is blocked/failed when hardened lab echoes payload."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(
            return_value=_make_mock_client("{{config}}", "http://127.0.0.1:5002/render")
        )
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await runner.run_stage(
            jinja2_engine, "http://127.0.0.1:5002", "fingerprint", mode="hardened"
        )

    assert result.status in ("blocked", "failed")


@pytest.mark.asyncio
async def test_fingerprint_finding_created(jinja2_engine):
    """A finding is created with RENDER-002 when fingerprint succeeds."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(
            return_value=_make_mock_client("lipsum function")
        )
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await runner.run_stage(
            jinja2_engine, "http://127.0.0.1:5001", "fingerprint"
        )

    assert len(fin) > 0
    finding = fin[0]
    assert finding["rule_id"] == "RENDER-002"
    assert finding["engine"] == "jinja2"


def test_fingerprint_probes_all_engines():
    """Every engine has at least one fingerprint probe."""
    from engines import ALL_ENGINES
    for name, engine in ALL_ENGINES.items():
        assert len(engine.fingerprint_probes) > 0, f"{name} has no fingerprint probes"


def test_jinja2_check_fingerprint():
    """check_fingerprint returns True for known Jinja2 markers."""
    from engines.jinja2_engine import Jinja2Engine
    eng = Jinja2Engine()
    assert eng.check_fingerprint("<Config {'DEBUG': True}>")
    assert eng.check_fingerprint("TemplateReference")
    assert eng.check_fingerprint("aaaaa")
    assert not eng.check_fingerprint("random string with no markers")
