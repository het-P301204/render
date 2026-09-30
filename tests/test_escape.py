"""Tests for the ESCAPE attack stage."""

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
async def test_escape_subclasses_jinja2(jinja2_engine):
    """Jinja2 escape succeeds when subclass list is returned."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    response_text = (
        "[<class 'type'>, <class 'object'>, <class 'subprocess.Popen'>, ...]"
    )

    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(
            return_value=_mock_client(response_text)
        )
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await runner.run_stage(
            jinja2_engine, "http://127.0.0.1:5001", "escape"
        )

    assert result.status == "success"


@pytest.mark.asyncio
async def test_escape_builtins_mako(mako_engine):
    """Mako escape succeeds when builtins dict is returned."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    response_text = "{'__import__': <built-in function __import__>, 'print': <built-in>}"

    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(
            return_value=_mock_client(response_text, "http://127.0.0.1:5003/render")
        )
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await runner.run_stage(
            mako_engine, "http://127.0.0.1:5003", "escape"
        )

    assert result.status == "success"


@pytest.mark.asyncio
async def test_escape_blocked_hardened(jinja2_engine):
    """Escape stage blocked when payload is echoed unchanged."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(
            return_value=_mock_client(
                "{{''.__class__.__mro__[1].__subclasses__()}}",
                "http://127.0.0.1:5002/render",
            )
        )
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await runner.run_stage(
            jinja2_engine, "http://127.0.0.1:5002", "escape", mode="hardened"
        )

    assert result.status in ("blocked", "failed")


@pytest.mark.asyncio
async def test_escape_empty_response_fails(jinja2_engine):
    """Escape stage fails when response is empty."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(
            return_value=_mock_client("")
        )
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await runner.run_stage(
            jinja2_engine, "http://127.0.0.1:5001", "escape"
        )

    assert result.status in ("blocked", "failed", "error")


def test_escape_payloads_defined_all_engines():
    """All engines have at least one escape payload."""
    from engines import ALL_ENGINES
    for name, engine in ALL_ENGINES.items():
        assert len(engine.escape_payloads) >= 1, f"{name} has no escape payloads"
