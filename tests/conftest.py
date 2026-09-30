"""Shared pytest fixtures for RENDER SSTI research platform tests.

All HTTP calls are mocked — no lab servers need to be running.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
import pytest_asyncio
import httpx

# Make project root importable
_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from engines import ALL_ENGINES
from engines.jinja2_engine import Jinja2Engine
from engines.mako_engine import MakoEngine
from engines.handlebars_engine import HandlebarsEngine
from engines.nunjucks_engine import NunjucksEngine
from attack.stage_runner import AttackRunner


# ─── Engine fixtures ──────────────────────────────────────────────────────────

@pytest.fixture
def jinja2_engine() -> Jinja2Engine:
    return Jinja2Engine()


@pytest.fixture
def mako_engine() -> MakoEngine:
    return MakoEngine()


@pytest.fixture
def handlebars_engine() -> HandlebarsEngine:
    return HandlebarsEngine()


@pytest.fixture
def nunjucks_engine() -> NunjucksEngine:
    return NunjucksEngine()


# ─── Runner fixture ───────────────────────────────────────────────────────────

@pytest.fixture
def runner() -> AttackRunner:
    tel: list[dict] = []
    fin: list[dict] = []
    return AttackRunner(telemetry_list=tel, findings_list=fin)


# ─── Mock HTTP response helpers ───────────────────────────────────────────────

def make_lab_response(output: str, status_code: int = 200) -> httpx.Response:
    """Build a mock lab server httpx.Response."""
    import json
    content = json.dumps({"output": output}).encode()
    return httpx.Response(
        status_code=status_code,
        content=content,
        headers={"content-type": "application/json"},
        request=httpx.Request("POST", "http://127.0.0.1:9999/render"),
    )


class MockTransport(httpx.AsyncBaseTransport):
    """Configurable mock transport for httpx.AsyncClient."""

    def __init__(self, responses: dict[str, str]) -> None:
        """
        Args:
            responses: Mapping of payload substring -> output string.
                       Use '*' as a wildcard to match any payload.
        """
        self.responses = responses
        self.calls: list[dict] = []

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        import json
        body = request.content.decode()
        payload = json.loads(body).get("input", "")
        self.calls.append({"payload": payload, "url": str(request.url)})

        for key, output in self.responses.items():
            if key == "*" or key in payload:
                return make_lab_response(output)

        # Default: echo the payload (not evaluated)
        return make_lab_response(payload)


@pytest.fixture
def detection_transport() -> MockTransport:
    """Transport that returns '49' for math probes."""
    return MockTransport({"7*7": "49", "41+1": "42", "abc": "abcabcabc"})


@pytest.fixture
def fingerprint_transport_jinja2() -> MockTransport:
    return MockTransport({
        "config": "<Config {'DEBUG': True}>",
        "__class__": "<class 'jinja2.runtime.TemplateReference'>",
        "'a'*5": "aaaaa",
        "lipsum": "lipsum",
    })


@pytest.fixture
def fingerprint_transport_mako() -> MockTransport:
    return MockTransport({
        "__class__": "<class 'mako.runtime.Template'>",
        "self.module": "<module 'mako_template'>",
        "context.keys()": "['context', 'caller']",
    })


@pytest.fixture
def extract_transport() -> MockTransport:
    return MockTransport({
        "config.items()": "dict_items([('SECRET_KEY', 'dev')])",
        "request.environ": "{'PATH_INFO': '/', 'REQUEST_METHOD': 'POST'}",
        "__globals__": "{'__builtins__': {'__import__': <built-in function __import__>}}",
        "dir(self)": "['callstack', 'module', '_at_undefined', 'context']",
    })


@pytest.fixture
def escape_transport() -> MockTransport:
    return MockTransport({
        "__subclasses__": "[<class 'subprocess.Popen'>, ...]",
        "__builtins__": "{'__import__': <built-in>}",
    })


@pytest.fixture
def rce_transport() -> MockTransport:
    return MockTransport({
        "whoami": "root\n",
        "id": "uid=0(root) gid=0(root)\n",
        "hostname": "lab-server\n",
        "uname": "Linux lab 5.15.0 #1 SMP x86_64 GNU/Linux\n",
    })


@pytest.fixture
def blocked_transport() -> MockTransport:
    """Transport that echoes back the payload unchanged (hardened lab)."""
    return MockTransport({"*": "{{7*7}}"})


# ─── FastAPI TestClient fixture ───────────────────────────────────────────────

@pytest.fixture
def api_client():
    """FastAPI TestClient with clean in-memory state."""
    from fastapi.testclient import TestClient
    from api.main import app, _telemetry, _findings, _reports

    _telemetry.clear()
    _findings.clear()
    _reports.clear()

    with TestClient(app) as client:
        yield client
