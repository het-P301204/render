"""Report generator for RENDER SSTI research platform."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import uuid4


def generate_json_report(
    findings: list[dict],
    telemetry: list[dict],
    title: Optional[str] = None,
    output_path: Optional[Path] = None,
) -> dict:
    """Generate a JSON report from findings and telemetry.

    Args:
        findings: List of finding dicts (from in-memory store).
        telemetry: List of telemetry event dicts.
        title: Optional report title.
        output_path: If provided, write the report to this path.

    Returns:
        Report dict.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    title = title or f"RENDER SSTI Research Report — {timestamp}"

    severity_counts: dict[str, int] = {}
    for f in findings:
        sev = f.get("severity", "unknown")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    engines_tested = list({f.get("engine", "") for f in findings} - {""})
    rules_triggered = list({f.get("rule_id", "") for f in findings} - {""})

    report = {
        "id": str(uuid4()),
        "title": title,
        "format": "json",
        "generated_at": timestamp,
        "summary": {
            "total_findings": len(findings),
            "severity_breakdown": severity_counts,
            "total_telemetry_events": len(telemetry),
            "engines_tested": sorted(engines_tested),
            "rules_triggered": sorted(rules_triggered),
            "rce_achieved": any(
                f.get("rule_id") == "RENDER-003" for f in findings
            ),
        },
        "findings": findings,
        "telemetry_sample": telemetry[:100],
    }

    if output_path is not None:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    return report
