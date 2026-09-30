"""Detection rules for RENDER SSTI research platform.

Each rule is a dict describing the finding type; rule evaluation
logic lives in evaluate_rules().
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional


# ─── Rule definitions ────────────────────────────────────────────────────────

RENDER_001: dict = {
    "id": "RENDER-001",
    "name": "Template Expression Evaluation Detected",
    "description": (
        "A mathematical expression embedded inside template syntax was evaluated "
        "by the server, confirming the presence of a Server-Side Template Injection "
        "vulnerability."
    ),
    "severity": "high",
    "cvss_score": 8.1,
    "trigger": "response_contains_math_result",
    "stages": ["detection"],
    "remediation": (
        "Never pass user-supplied strings directly to a template renderer. "
        "Use the engine's safe rendering API with a fixed template and only "
        "pass user data as context variables."
    ),
}

RENDER_002: dict = {
    "id": "RENDER-002",
    "name": "Template Engine Fingerprinted",
    "description": (
        "The template engine running on the server has been positively identified "
        "via engine-specific response patterns. This allows an attacker to craft "
        "targeted payloads for that engine."
    ),
    "severity": "high",
    "cvss_score": 7.5,
    "trigger": "engine_specific_response_matched",
    "stages": ["fingerprinting"],
    "remediation": (
        "Suppress detailed error messages and engine-identifying strings in "
        "production responses. Apply Content-Security-Policy and generic error pages."
    ),
}

RENDER_003: dict = {
    "id": "RENDER-003",
    "name": "Remote Code Execution via Template Injection Confirmed",
    "description": (
        "An attacker-controlled system command was successfully executed on the "
        "server through a template injection payload. This represents full system "
        "compromise."
    ),
    "severity": "critical",
    "cvss_score": 10.0,
    "trigger": "command_output_in_response",
    "stages": ["rce"],
    "remediation": (
        "Immediately disable the vulnerable endpoint. Apply input validation and "
        "use sandboxed template environments. Patch or replace the vulnerable "
        "templating code and perform a full incident response."
    ),
}

ALL_RULES: list[dict] = [RENDER_001, RENDER_002, RENDER_003]


# ─── Result dataclass ─────────────────────────────────────────────────────────

@dataclass
class DetectionResult:
    """Result of evaluating detection rules against a stage result."""
    triggered: bool = False
    rule_id: Optional[str] = None
    rule_name: Optional[str] = None
    severity: Optional[str] = None
    evidence: dict = field(default_factory=dict)
    details: str = ""


# ─── Rule evaluation ──────────────────────────────────────────────────────────

# Command output patterns — tightly scoped to safe research commands only
_RCE_PATTERNS: list[re.Pattern] = [
    re.compile(r"\broot\b"),
    re.compile(r"\bwww-data\b"),
    re.compile(r"\bdaemon\b"),
    re.compile(r"\bnobody\b"),
    re.compile(r"\bubuntu\b"),
    re.compile(r"uid=\d+\(\w+\)"),
    re.compile(r"Linux\s+\S+\s+\d+\.\d+"),
    re.compile(r"Darwin\s+\d+\.\d+"),
]

# Math result markers for detection probes
_MATH_RESULTS = {"49", "42", "abcabcabc", "aaaaa", "foobar"}

# Fingerprint response markers per engine
_FINGERPRINT_MARKERS: dict[str, list[str]] = {
    "jinja2": ["<Config", "TemplateReference", "aaaaa", "lipsum"],
    "handlebars": ["[object Object]", "Object", "function"],
    "nunjucks": ["0,1,2", "0 1 2", "cycler", "joiner"],
    "mako": ["Template", "mako", "callstack", "context"],
}


def evaluate_rules(
    stage: str,
    response_text: str,
    payload_used: str,
    engine_name: str = "",
) -> DetectionResult:
    """Evaluate all rules against a stage response and return the first match.

    Args:
        stage: Attack stage name (detect, fingerprint, extract, escape, rce).
        response_text: Raw response body from the lab server.
        payload_used: The payload that was sent.
        engine_name: Optional engine name for fingerprint rule evaluation.

    Returns:
        DetectionResult with triggered=True if a rule fired.
    """
    lower_response = response_text.lower()

    # ── RENDER-001: detection stage, math result found ────────────────────
    if stage == "detect":
        for marker in _MATH_RESULTS:
            if marker in response_text:
                return DetectionResult(
                    triggered=True,
                    rule_id=RENDER_001["id"],
                    rule_name=RENDER_001["name"],
                    severity=RENDER_001["severity"],
                    evidence={
                        "marker_found": marker,
                        "payload": payload_used,
                        "response_excerpt": response_text[:200],
                    },
                    details=(
                        f"Math marker '{marker}' found in response, "
                        f"confirming template expression evaluation."
                    ),
                )

    # ── RENDER-002: fingerprinting stage, engine marker found ─────────────
    if stage == "fingerprint":
        markers = _FINGERPRINT_MARKERS.get(engine_name.lower(), [])
        # Also check generic markers
        generic_markers = ["<Config", "TemplateReference", "[object Object]",
                           "Template", "mako", "cycler", "lipsum"]
        all_markers = markers + generic_markers
        for marker in all_markers:
            if marker in response_text or marker.lower() in lower_response:
                return DetectionResult(
                    triggered=True,
                    rule_id=RENDER_002["id"],
                    rule_name=RENDER_002["name"],
                    severity=RENDER_002["severity"],
                    evidence={
                        "engine_marker": marker,
                        "engine_identified": engine_name or "unknown",
                        "payload": payload_used,
                        "response_excerpt": response_text[:200],
                    },
                    details=(
                        f"Engine marker '{marker}' found; engine identified as "
                        f"'{engine_name or 'unknown'}'."
                    ),
                )

    # ── RENDER-003: rce stage, command output found ───────────────────────
    if stage == "rce":
        for pattern in _RCE_PATTERNS:
            m = pattern.search(response_text)
            if m:
                return DetectionResult(
                    triggered=True,
                    rule_id=RENDER_003["id"],
                    rule_name=RENDER_003["name"],
                    severity=RENDER_003["severity"],
                    evidence={
                        "command_output_match": m.group(0),
                        "payload": payload_used,
                        "response_excerpt": response_text[:300],
                    },
                    details=(
                        f"Command output pattern '{m.group(0)}' found in response, "
                        f"confirming RCE via template injection."
                    ),
                )

    return DetectionResult(triggered=False)
