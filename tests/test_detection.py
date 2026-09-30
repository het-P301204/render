"""Tests for the DETECT attack stage."""

from __future__ import annotations

import pytest
import httpx
from unittest.mock import AsyncMock, patch

from attack.stage_runner import AttackRunner
from tests.conftest import MockTransport


@pytest.mark.asyncio
async def test_detect_success_jinja2(jinja2_engine, detection_transport):
    """Jinja2 detect stage returns success when lab evaluates {{7*7}}=49."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    async with httpx.AsyncClient(transport=detection_transport) as client:
        # Monkey-patch the runner to use our mock client
        original = runner._post_payload

        async def mock_post(c, url, payload):
            return await original(detection_transport._get_response(payload), 10.0)

    # Use a simpler approach: patch httpx.AsyncClient
    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(
            return_value=httpx.Response(
                200,
                json={"output": "49"},
                request=httpx.Request("POST", "http://127.0.0.1:5001/render"),
            )
        )

        result = await runner.run_stage(
            jinja2_engine, "http://127.0.0.1:5001", "detect"
        )

    assert result.status == "success"
    assert result.stage == "detect"
    assert "49" in result.raw_response


@pytest.mark.asyncio
async def test_detect_blocked_hardened(jinja2_engine):
    """Detect stage returns blocked/failed when lab echoes payload unchanged."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(
            return_value=httpx.Response(
                200,
                json={"output": "{{7*7}}"},  # not evaluated
                request=httpx.Request("POST", "http://127.0.0.1:5002/render"),
            )
        )

        result = await runner.run_stage(
            jinja2_engine, "http://127.0.0.1:5002", "detect", mode="hardened"
        )

    assert result.status in ("blocked", "failed")
    assert result.stage == "detect"


@pytest.mark.asyncio
async def test_detect_connection_error(jinja2_engine):
    """Detect stage returns error status when lab is unreachable."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(
            side_effect=httpx.ConnectError("Connection refused")
        )

        result = await runner.run_stage(
            jinja2_engine, "http://127.0.0.1:5001", "detect"
        )

    assert result.status == "error"
    assert result.error is not None


@pytest.mark.asyncio
async def test_detect_telemetry_emitted(jinja2_engine):
    """A telemetry event is emitted after each stage run."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(
            return_value=httpx.Response(
                200,
                json={"output": "49"},
                request=httpx.Request("POST", "http://127.0.0.1:5001/render"),
            )
        )

        await runner.run_stage(jinja2_engine, "http://127.0.0.1:5001", "detect")

    assert len(tel) == 1
    event = tel[0]
    assert event["stage"] == "detect"
    assert event["engine"] == "jinja2"


@pytest.mark.asyncio
async def test_detect_mako_success(mako_engine):
    """Mako detect stage uses ${7*7} and expects 49."""
    tel: list = []
    fin: list = []
    runner = AttackRunner(telemetry_list=tel, findings_list=fin)

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(
            return_value=httpx.Response(
                200,
                json={"output": "49"},
                request=httpx.Request("POST", "http://127.0.0.1:5003/render"),
            )
        )

        result = await runner.run_stage(
            mako_engine, "http://127.0.0.1:5003", "detect"
        )

    assert result.status == "success"
    # Verify the payload used is Mako-style
    assert "${" in result.payload_used


def test_detect_payload_not_empty(jinja2_engine):
    """Detection probes are not empty."""
    probes = jinja2_engine.get_probes_for_stage("detect")
    assert len(probes) > 0
    for p in probes:
        assert p.payload
        assert p.expected
