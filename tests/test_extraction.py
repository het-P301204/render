"""Tests for the EXTRACT attack stage."""

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
async def test_extract_config_items(jinja2_engine):
    """Extraction stage succeeds when config items are returned."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    response_text = "dict_items([('SECRET_KEY', 'supersecret'), ('DEBUG', True)])"

    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(
            return_value=_mock_client(response_text)
        )
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await runner.run_stage(
            jinja2_engine, "http://127.0.0.1:5001", "extract"
        )

    assert result.status == "success"
    assert result.evidence.get("data_extracted") is not None


@pytest.mark.asyncio
async def test_extract_mako_dir_self(mako_engine):
    """Mako extraction stage succeeds with dir(self) output."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    response_text = "['callstack', 'module', 'context', '_at_undefined']"

    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(
            return_value=_mock_client(response_text, "http://127.0.0.1:5003/render")
        )
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await runner.run_stage(
            mako_engine, "http://127.0.0.1:5003", "extract"
        )

    assert result.status == "success"
    assert "callstack" in result.raw_response


@pytest.mark.asyncio
async def test_extract_blocked_when_echoed(jinja2_engine):
    """Extraction stage is blocked when response echoes the payload."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(
            return_value=_mock_client("{{config.items()}}")  # not evaluated
        )
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await runner.run_stage(
            jinja2_engine, "http://127.0.0.1:5002", "extract", mode="hardened"
        )

    assert result.status in ("blocked", "failed")


@pytest.mark.asyncio
async def test_extract_telemetry_stage_name(jinja2_engine):
    """Telemetry event stage is 'extract'."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(
            return_value=_mock_client("dict_items([('KEY', 'VAL')])")
        )
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        await runner.run_stage(jinja2_engine, "http://127.0.0.1:5001", "extract")

    assert len(tel) == 1
    assert tel[0]["stage"] == "extract"


def test_extract_payloads_defined(jinja2_engine, mako_engine):
    """Both Jinja2 and Mako have extraction payloads defined."""
    assert len(jinja2_engine.extract_payloads) >= 2
    assert len(mako_engine.extract_payloads) >= 2
