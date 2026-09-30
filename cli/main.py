"""CLI for RENDER SSTI research platform.

Usage:
  render scan       --engine jinja2 --target http://127.0.0.1:5001
  render attack     --engine jinja2 --target http://127.0.0.1:5001 --stage detect
  render attack     --engine jinja2 --target http://127.0.0.1:5001 --chain
  render compare    --engine jinja2 --payload "{{7*7}}"
  render payloads   --engine jinja2
  render findings
  render report     --output report.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table
from rich import box

# Make project root importable
_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from attack.stage_runner import AttackRunner, ChainResult, StageResult
from engines import ALL_ENGINES
from detection.rules import ALL_RULES

console = Console()
_runner = AttackRunner()


# ─── Helpers ──────────────────────────────────────────────────────────────────

STATUS_STYLES = {
    "success": "[bold green]SUCCESS[/bold green]",
    "blocked": "[bold yellow]BLOCKED[/bold yellow]",
    "failed": "[bold red]FAILED[/bold red]",
    "error": "[bold red]ERROR[/bold red]",
    "skipped": "[dim]SKIPPED[/dim]",
    "detected": "[bold cyan]DETECTED[/bold cyan]",
    "unknown": "[dim]UNKNOWN[/dim]",
}

SEVERITY_STYLES = {
    "critical": "[bold red]CRITICAL[/bold red]",
    "high": "[bold orange3]HIGH[/bold orange3]",
    "medium": "[yellow]MEDIUM[/yellow]",
    "low": "[green]LOW[/green]",
}


def _status_label(status: str) -> str:
    return STATUS_STYLES.get(status, status.upper())


def _sev_label(severity: str) -> str:
    return SEVERITY_STYLES.get(severity.lower(), severity.upper())


def _resolve_engine(engine_name: str):
    if engine_name not in ALL_ENGINES:
        console.print(
            f"[bold red]Unknown engine '{engine_name}'.[/bold red] "
            f"Available: {', '.join(ALL_ENGINES.keys())}"
        )
        raise SystemExit(1)
    return ALL_ENGINES[engine_name]


def _print_stage_result(result: StageResult) -> None:
    label = _status_label(result.status)
    title = f"Stage: [bold]{result.stage.upper()}[/bold]  |  {label}"
    lines = [
        f"[dim]Engine:[/dim]  {result.engine}",
        f"[dim]Target:[/dim]  {result.target_url}",
        f"[dim]Payload:[/dim] {result.payload_used[:120]}",
        f"[dim]Response:[/dim] {result.raw_response[:200]}",
        f"[dim]Time:[/dim]   {result.response_time_ms:.1f} ms",
    ]
    if result.error:
        lines.append(f"[red]Error:[/red] {result.error}")
    if result.finding:
        sev = _sev_label(result.finding.get("severity", ""))
        lines.append(f"[bold]Finding:[/bold] {result.finding.get('rule_id')} — {sev}")

    style = "green" if result.status == "success" else (
        "yellow" if result.status == "blocked" else "red"
    )
    console.print(Panel("\n".join(lines), title=title, border_style=style))


# ─── CLI group ────────────────────────────────────────────────────────────────

@click.group()
@click.version_option("1.0.0", prog_name="render")
def cli():
    """RENDER — Server-Side Template Injection Research Platform CLI."""


# ─── scan ─────────────────────────────────────────────────────────────────────

@cli.command()
@click.option("--engine", "-e", required=True, help="Template engine (jinja2, mako, handlebars, nunjucks)")
@click.option("--target", "-t", required=True, help="Target URL, e.g. http://127.0.0.1:5001")
@click.option("--mode", "-m", default="vulnerable", show_default=True,
              type=click.Choice(["vulnerable", "hardened"]), help="Lab mode")
def scan(engine: str, target: str, mode: str):
    """Run detect + fingerprint stages (quick scan)."""
    eng = _resolve_engine(engine)
    console.rule(f"[bold cyan]RENDER Scan — {engine} @ {target}[/bold cyan]")

    for stage in ("detect", "fingerprint"):
        with Progress(
            SpinnerColumn(),
            TextColumn(f"  Running [bold]{stage}[/bold] stage..."),
            console=console,
            transient=True,
        ) as progress:
            progress.add_task("", total=None)
            result = _runner.run_stage_sync(eng, target, stage, mode=mode)
        _print_stage_result(result)


# ─── attack ───────────────────────────────────────────────────────────────────

@cli.command()
@click.option("--engine", "-e", required=True, help="Template engine")
@click.option("--target", "-t", required=True, help="Target URL")
@click.option("--stage", "-s", default=None,
              type=click.Choice(["detect", "fingerprint", "extract", "escape", "rce"]),
              help="Single stage to run")
@click.option("--chain", is_flag=True, default=False, help="Run the full 5-stage chain")
@click.option("--payload", "-p", default=None, help="Custom payload string")
@click.option("--mode", "-m", default="vulnerable", show_default=True,
              type=click.Choice(["vulnerable", "hardened"]))
def attack(engine: str, target: str, stage: str, chain: bool, payload: str, mode: str):
    """Run a single stage or the full attack chain."""
    if not stage and not chain:
        console.print("[red]Specify --stage <name> or --chain[/red]")
        raise SystemExit(1)

    eng = _resolve_engine(engine)
    console.rule(f"[bold red]RENDER Attack — {engine} @ {target}[/bold red]")

    if chain:
        with Progress(
            SpinnerColumn(),
            TextColumn("  Running full attack chain..."),
            console=console,
            transient=True,
        ) as progress:
            progress.add_task("", total=None)
            chain_result: ChainResult = _runner.run_chain_sync(eng, target, mode=mode)

        for sr in chain_result.stages:
            _print_stage_result(sr)

        summary = chain_result.summary
        rce_label = "[bold green]YES[/bold green]" if summary["rce_achieved"] else "[bold red]NO[/bold red]"
        console.print(
            Panel(
                f"Stages run: {summary['total_stages']}\n"
                f"Findings:   {summary['findings_count']}\n"
                f"RCE:        {rce_label}",
                title="[bold]Chain Summary[/bold]",
                border_style="cyan",
            )
        )
    else:
        with Progress(
            SpinnerColumn(),
            TextColumn(f"  Running [bold]{stage}[/bold] stage..."),
            console=console,
            transient=True,
        ) as progress:
            progress.add_task("", total=None)
            result = _runner.run_stage_sync(eng, target, stage, payload=payload, mode=mode)
        _print_stage_result(result)


# ─── compare ──────────────────────────────────────────────────────────────────

@cli.command()
@click.option("--engine", "-e", required=True, help="Template engine")
@click.option("--payload", "-p", required=True, help="Payload to compare")
@click.option("--stage", "-s", default="detect", show_default=True,
              type=click.Choice(["detect", "fingerprint", "extract", "escape", "rce"]))
@click.option("--vulnerable-url", default=None, help="Override vulnerable lab URL")
@click.option("--hardened-url", default=None, help="Override hardened lab URL")
def compare(engine: str, payload: str, stage: str, vulnerable_url: str, hardened_url: str):
    """Compare payload against vulnerable vs hardened lab."""
    eng = _resolve_engine(engine)
    vuln_url = vulnerable_url or eng.default_vulnerable_url
    hard_url = hardened_url or eng.default_hardened_url

    console.rule(f"[bold magenta]RENDER Compare — {engine}[/bold magenta]")

    with Progress(
        SpinnerColumn(),
        TextColumn("  Running comparison..."),
        console=console,
        transient=True,
    ) as progress:
        progress.add_task("", total=None)
        result = _runner.run_compare_sync(eng, payload, stage, vuln_url, hard_url)

    table = Table(
        title="Comparison Result",
        box=box.ROUNDED,
        show_lines=True,
    )
    table.add_column("Field", style="cyan", no_wrap=True)
    table.add_column("Vulnerable", style="red")
    table.add_column("Hardened", style="green")

    vuln = result["vulnerable"]
    hard = result["hardened"]

    table.add_row("Status", _status_label(vuln["status"]), _status_label(hard["status"]))
    table.add_row("Response (excerpt)", vuln["raw_response"][:100], hard["raw_response"][:100])
    table.add_row(
        "Rule Triggered",
        str(vuln.get("detection_triggered", False)),
        str(hard.get("detection_triggered", False)),
    )
    table.add_row(
        "Protection Effective",
        "",
        "[bold green]YES[/bold green]" if result["comparison"]["protection_effective"] else "[bold red]NO[/bold red]",
    )

    console.print(table)


# ─── payloads ─────────────────────────────────────────────────────────────────

@cli.command("payloads")
@click.option("--engine", "-e", default=None, help="Filter by engine name")
@click.option("--stage", "-s", default=None,
              type=click.Choice(["detection", "fingerprinting", "extraction", "escape", "rce"]),
              help="Filter by stage")
def list_payloads(engine: str, stage: str):
    """List available payloads from the YAML library."""
    import yaml as _yaml

    engines_to_show = [engine] if engine else list(ALL_ENGINES.keys())
    table = Table(
        title="RENDER Payload Library",
        box=box.ROUNDED,
        show_lines=True,
    )
    table.add_column("ID", style="cyan", no_wrap=True)
    table.add_column("Engine", style="magenta")
    table.add_column("Stage", style="yellow")
    table.add_column("Name")
    table.add_column("Payload", style="dim")
    table.add_column("Expected")

    for eng_name in engines_to_show:
        if eng_name not in ALL_ENGINES:
            console.print(f"[red]Unknown engine '{eng_name}'[/red]")
            continue
        payload_file = _ROOT / "payloads" / f"{eng_name}.yaml"
        if not payload_file.exists():
            continue
        with open(payload_file, encoding="utf-8") as f:
            data = _yaml.safe_load(f)
        for p in data.get("payloads", []):
            if stage and p.get("stage") != stage:
                continue
            table.add_row(
                p.get("id", ""),
                eng_name,
                p.get("stage", ""),
                p.get("name", ""),
                p.get("payload", "")[:60],
                p.get("expected", ""),
            )

    console.print(table)


# ─── findings ─────────────────────────────────────────────────────────────────

@cli.command("findings")
def list_findings_cmd():
    """Show findings from the current session."""
    from attack.stage_runner import get_findings as _get_findings
    findings = _get_findings()

    if not findings:
        console.print("[dim]No findings yet. Run an attack first.[/dim]")
        return

    table = Table(title="RENDER Findings", box=box.ROUNDED, show_lines=True)
    table.add_column("ID", style="cyan", no_wrap=True)
    table.add_column("Rule ID", style="magenta")
    table.add_column("Severity")
    table.add_column("Engine")
    table.add_column("Stage")
    table.add_column("Timestamp", style="dim")

    for f in findings:
        table.add_row(
            f.get("id", "")[:8] + "...",
            f.get("rule_id", ""),
            _sev_label(f.get("severity", "")),
            f.get("engine", ""),
            f.get("stage", ""),
            f.get("timestamp", "")[:19],
        )

    console.print(table)


# ─── report ───────────────────────────────────────────────────────────────────

@cli.command("report")
@click.option("--output", "-o", default="render_report.json", show_default=True,
              help="Output file path")
@click.option("--format", "fmt", default="json", show_default=True,
              type=click.Choice(["json"]), help="Report format")
def generate_report(output: str, fmt: str):
    """Generate a report from current session findings and telemetry."""
    from attack.stage_runner import get_findings as _gf, get_telemetry as _gt
    from datetime import datetime, timezone

    findings = _gf()
    telemetry = _gt()
    timestamp = datetime.now(timezone.utc).isoformat()

    severity_counts: dict[str, int] = {}
    for f in findings:
        sev = f.get("severity", "unknown")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    report = {
        "title": f"RENDER SSTI Research Report — {timestamp}",
        "generated_at": timestamp,
        "format": fmt,
        "summary": {
            "total_findings": len(findings),
            "severity_breakdown": severity_counts,
            "total_telemetry_events": len(telemetry),
            "engines_tested": list({f.get("engine", "") for f in findings}),
        },
        "findings": findings,
        "telemetry_sample": telemetry[:50],
    }

    out_path = Path(output)
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    console.print(f"[bold green]Report written to:[/bold green] {out_path.resolve()}")
    console.print(f"  Findings:  {len(findings)}")
    console.print(f"  Telemetry: {len(telemetry)}")


# ─── rules ────────────────────────────────────────────────────────────────────

@cli.command("rules")
def list_rules():
    """List detection rules (RENDER-001/002/003)."""
    table = Table(title="RENDER Detection Rules", box=box.ROUNDED, show_lines=True)
    table.add_column("Rule ID", style="cyan")
    table.add_column("Name")
    table.add_column("Severity")
    table.add_column("CVSS")
    table.add_column("Stages")

    for rule in ALL_RULES:
        table.add_row(
            rule["id"],
            rule["name"],
            _sev_label(rule["severity"]),
            str(rule.get("cvss_score", "")),
            ", ".join(rule.get("stages", [])),
        )

    console.print(table)


# ─── Entry ────────────────────────────────────────────────────────────────────

def main():
    cli()


if __name__ == "__main__":
    main()
