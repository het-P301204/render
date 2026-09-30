"""Tests for the RCE attack stage (all mocked — no real commands executed)."""

from __future__ import annotations

import pytest
import httpx
from unittest.mock import AsyncMock, patch

from attack.stage_runner import AttackRunner


def _mock_client(output: str, url: str = "http://127.0.0.1:5001/render"):
    mc = AsyncMock()
    mc.post = AsyncMock(
        return_value=httpx.Response(
            200,
            json={"output": output},
            request=httpx.Request("POST", url),
        )
    )
    return mc


@pytest.mark.asyncio
async def test_rce_success_jinja2_whoami(jinja2_engine):
    """Jinja2 RCE stage succeeds when 'root' appears in response."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(
            return_value=_mock_client("root\n")
        )
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await runner.run_stage(
            jinja2_engine, "http://127.0.0.1:5001", "rce"
        )

    assert result.status == "success"
    assert result.stage == "rce"
    assert "root" in result.raw_response


@pytest.mark.asyncio
async def test_rce_success_mako_id(mako_engine):
    """Mako RCE stage succeeds when uid= appears in response."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(
            return_value=_mock_client("uid=0(root) gid=0(root) groups=0(root)\n",
                                     "http://127.0.0.1:5003/render")
        )
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await runner.run_stage(
            mako_engine, "http://127.0.0.1:5003", "rce"
        )

    assert result.status == "success"


@pytest.mark.asyncio
async def test_rce_finding_render_003(jinja2_engine):
    """RCE success creates a RENDER-003 finding."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(
            return_value=_mock_client("uid=33(www-data) gid=33(www-data)\n")
        )
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await runner.run_stage(
            jinja2_engine, "http://127.0.0.1:5001", "rce"
        )

    assert result.finding is not None
    assert result.finding["rule_id"] == "RENDER-003"
    assert result.finding["severity"] == "critical"
    assert len(fin) == 1


@pytest.mark.asyncio
async def test_rce_blocked_hardened(jinja2_engine):
    """RCE stage is blocked in hardened mode."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(
            return_value=_mock_client(
                "Access Denied",
                "http://127.0.0.1:5002/render",
            )
        )
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await runner.run_stage(
            jinja2_engine, "http://127.0.0.1:5002", "rce", mode="hardened"
        )

    assert result.status in ("blocked", "failed")
    assert not fin  # no RENDER-003 finding


@pytest.mark.asyncio
async def test_rce_handlebars(handlebars_engine):
    """Handlebars RCE stage triggers correctly."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(
            return_value=_mock_client("nobody\n", "http://127.0.0.1:3001/render")
        )
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await runner.run_stage(
            handlebars_engine, "http://127.0.0.1:3001", "rce"
        )

    assert result.status == "success"


@pytest.mark.asyncio
async def test_rce_telemetry_event(jinja2_engine):
    """Telemetry event is emitted with rce stage name."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(
            return_value=_mock_client("root\n")
        )
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        await runner.run_stage(jinja2_engine, "http://127.0.0.1:5001", "rce")

    assert len(tel) == 1
    assert tel[0]["stage"] == "rce"
    assert tel[0]["status"] == "success"


def test_rce_payloads_safety_scope():
    """All RCE payloads are scoped to local_lab_only."""
    from engines import ALL_ENGINES
    for name, engine in ALL_ENGINES.items():
        for p in engine.rce_payloads:
            assert p.safety_scope == "local_lab_only", (
                f"{name} RCE payload {p.id} has unsafe scope: {p.safety_scope}"
            )
