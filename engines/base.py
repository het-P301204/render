"""Base template engine class for RENDER SSTI research platform."""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ProbePayload:
    """A single probe payload with metadata."""
    id: str
    name: str
    stage: str  # detection | fingerprinting | extraction | escape | rce
    payload: str
    expected: str
    explanation: str
    safety_scope: str = "local_lab_only"


@dataclass
class TemplateEngine:
    """Base class for a template engine's attack surface definition."""
    name: str = ""
    language: str = ""
    framework: str = ""
    default_vulnerable_url: str = ""
    default_hardened_url: str = ""

    detection_probes: list[ProbePayload] = field(default_factory=list)
    fingerprint_probes: list[ProbePayload] = field(default_factory=list)
    extract_payloads: list[ProbePayload] = field(default_factory=list)
    escape_payloads: list[ProbePayload] = field(default_factory=list)
    rce_payloads: list[ProbePayload] = field(default_factory=list)

    def get_probes_for_stage(self, stage: str) -> list[ProbePayload]:
        """Return probes for a given attack stage."""
        stage_map = {
            "detect": self.detection_probes,
            "fingerprint": self.fingerprint_probes,
            "extract": self.extract_payloads,
            "escape": self.escape_payloads,
            "rce": self.rce_payloads,
        }
        return stage_map.get(stage, [])

    def to_dict(self) -> dict:
        """Serialize engine metadata to a dict (no payloads)."""
        return {
            "name": self.name,
            "language": self.language,
            "framework": self.framework,
            "default_vulnerable_url": self.default_vulnerable_url,
            "default_hardened_url": self.default_hardened_url,
            "stages_supported": ["detect", "fingerprint", "extract", "escape", "rce"],
        }

    # ------------------------------------------------------------------
    # Detection helpers
    # ------------------------------------------------------------------

    def check_detection(self, response_text: str) -> bool:
        """Return True if any detection probe result appears in response."""
        markers = ["49", "7777777"]  # 7*7=49, 7**7=823543 edge cases
        return any(m in response_text for m in markers)

    def check_fingerprint(self, response_text: str) -> bool:
        """Override per-engine to verify fingerprint response."""
        raise NotImplementedError

    def check_rce(self, response_text: str) -> Optional[str]:
        """Return command output if RCE succeeded, else None."""
        # Basic heuristic: look for common UNIX username patterns
        import re
        patterns = [
            r"(?:root|www-data|daemon|nobody|ubuntu|ec2-user|user)\b",
            r"uid=\d+",
            r"Linux\s+\S+\s+\d+\.\d+",
        ]
        for pat in patterns:
            m = re.search(pat, response_text)
            if m:
                return response_text.strip()
        return None
