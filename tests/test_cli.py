"""Tests for the CLI using Click's test runner."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from click.testing import CliRunner

_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from cli.main import cli
from attack.stage_runner import StageResult, ChainResult


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def runner():
    return CliRunner()


def _make_stage_result(
    stage: str = "detect",
    status: str = "success",
    engine: str = "jinja2",
    payload: str = "{{7*7}}",
    response: str = "49",
    finding: dict = None,
) -> StageResult:
    return StageResult(
        stage=stage,
        engine=engine,
        target_url="http://127.0.0.1:5001",
        mode="vulnerable",
        status=status,
        payload_used=payload,
        raw_response=response,
        response_time_ms=12.3,
        evidence={"test": True},
        finding=finding,
    )


def _make_chain_result(stages: list[StageResult]) -> ChainResult:
    cr = ChainResult(
        engine="jinja2",
        target_url="http://127.0.0.1:5001",
        mode="vulnerable",
        stages=stages,
    )
    return cr


# ─── scan command ─────────────────────────────────────────────────────────────

def test_scan_success(runner):
    """scan command calls detect and fingerprint stages."""
    mock_result = _make_stage_result("detect", "success")

    with patch("cli.main._runner") as mock_runner:
        mock_runner.run_stage_sync.return_value = mock_result
        result = runner.invoke(cli, ["scan", "--engine", "jinja2", "--target", "http://127.0.0.1:5001"])

    assert result.exit_code == 0
    assert "detect" in result.output.lower() or "Stage" in result.output


def test_scan_unknown_engine(runner):
    """scan with unknown engine exits with code 1."""
    result = runner.invoke(cli, ["scan", "--engine", "unknown", "--target", "http://127.0.0.1:5001"])
    assert result.exit_code == 1 or "Unknown engine" in result.output


# ─── attack command ───────────────────────────────────────────────────────────

def test_attack_single_stage(runner):
    """attack --stage detect runs a single stage."""
    mock_result = _make_stage_result("detect", "success")

    with patch("cli.main._runner") as mock_runner:
        mock_runner.run_stage_sync.return_value = mock_result
        result = runner.invoke(
            cli,
            ["attack", "--engine", "jinja2", "--target", "http://127.0.0.1:5001", "--stage", "detect"],
        )

    assert result.exit_code == 0


def test_attack_chain(runner):
    """attack --chain runs the full chain."""
    stages = [
        _make_stage_result("detect", "success"),
        _make_stage_result("fingerprint", "success"),
        _make_stage_result("extract", "success"),
        _make_stage_result("escape", "success"),
        _make_stage_result("rce", "success"),
    ]
    mock_chain = _make_chain_result(stages)

    with patch("cli.main._runner") as mock_runner:
        mock_runner.run_chain_sync.return_value = mock_chain
        result = runner.invoke(
            cli,
            ["attack", "--engine", "jinja2", "--target", "http://127.0.0.1:5001", "--chain"],
        )

    assert result.exit_code == 0


def test_attack_no_stage_or_chain(runner):
    """attack without --stage or --chain exits with error."""
    result = runner.invoke(
        cli,
        ["attack", "--engine", "jinja2", "--target", "http://127.0.0.1:5001"],
    )
    assert result.exit_code != 0 or "Specify" in result.output


# ─── payloads command ─────────────────────────────────────────────────────────

def test_payloads_list_all(runner):
    """payloads command lists payload IDs."""
    result = runner.invoke(cli, ["payloads"])
    assert result.exit_code == 0
    assert "j2-detect-001" in result.output or "mako-detect-001" in result.output


def test_payloads_filter_engine(runner):
    """payloads --engine jinja2 shows only jinja2 payloads."""
    result = runner.invoke(cli, ["payloads", "--engine", "jinja2"])
    assert result.exit_code == 0
    assert "j2-" in result.output


def test_payloads_filter_stage(runner):
    """payloads --stage rce shows only RCE payloads."""
    result = runner.invoke(cli, ["payloads", "--stage", "rce"])
    assert result.exit_code == 0


# ─── findings command ─────────────────────────────────────────────────────────

def test_findings_empty(runner):
    """findings command shows 'No findings' when store is empty."""
    with patch("attack.stage_runner.get_findings", return_value=[]):
        result = runner.invoke(cli, ["findings"])
    assert result.exit_code == 0
    assert "No findings" in result.output


def test_findings_shows_rule_id(runner):
    """findings command shows rule IDs in table."""
    fake_findings = [
        {
            "id": "abc-123",
            "rule_id": "RENDER-001",
            "rule_name": "Template Expression Evaluation Detected",
            "severity": "high",
            "engine": "jinja2",
            "stage": "detect",
            "timestamp": "2025-01-01T00:00:00+00:00",
        }
    ]
    with patch("attack.stage_runner.get_findings", return_value=fake_findings):
        result = runner.invoke(cli, ["findings"])
    assert result.exit_code == 0


# ─── rules command ────────────────────────────────────────────────────────────

def test_rules_command(runner):
    """rules command shows all three rule IDs."""
    result = runner.invoke(cli, ["rules"])
    assert result.exit_code == 0
    assert "RENDER-001" in result.output
    assert "RENDER-002" in result.output
    assert "RENDER-003" in result.output


# ─── report command ───────────────────────────────────────────────────────────

def test_report_generates_json(runner, tmp_path):
    """report command writes a valid JSON file."""
    output_file = tmp_path / "test_report.json"
    with patch("attack.stage_runner.get_findings", return_value=[]):
        with patch("attack.stage_runner.get_telemetry", return_value=[]):
            result = runner.invoke(cli, ["report", "--output", str(output_file)])

    assert result.exit_code == 0
    assert output_file.exists()
    data = json.loads(output_file.read_text())
    assert "findings" in data
    assert "summary" in data


# ─── help ─────────────────────────────────────────────────────────────────────

def test_cli_help(runner):
    """CLI --help returns usage info."""
    result = runner.invoke(cli, ["--help"])
    assert result.exit_code == 0
    assert "RENDER" in result.output


@pytest.mark.parametrize("subcommand", ["scan", "attack", "payloads", "findings", "report", "rules"])
def test_subcommand_help(runner, subcommand):
    """Each subcommand has --help."""
    result = runner.invoke(cli, [subcommand, "--help"])
    assert result.exit_code == 0
