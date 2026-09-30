"""
RENDER Platform — Mako Lab: VULNERABLE mode (port 5003)
========================================================
DELIBERATELY VULNERABLE: This app renders user input directly as a Mako
template, enabling SSTI. Mako templates support full Python expressions.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from mako.template import Template

app = Flask(__name__)
CORS(app)


@app.route('/')
def index():
    return """
    <html>
    <head><title>RENDER — Mako Lab (Vulnerable)</title></head>
    <body style="font-family:monospace;background:#1a1a1a;color:#ff4444;padding:2em">
    <h1>RENDER — Mako Lab</h1>
    <p><b>Mode:</b> VULNERABLE</p>
    <p><b>Port:</b> 5003</p>
    <p><b>Engine:</b> Mako</p>
    <p><b>Vulnerability:</b> User input is passed directly to Template().render()</p>
    <p><b>POST /render</b> — { "input": "&lt;template_string&gt;" }</p>
    <p><b>GET /health</b> — health check</p>
    <hr/>
    <p style="color:#ff6666">&#9888; This server is intentionally insecure. Do not expose to production.</p>
    </body></html>
    """, 200, {'Content-Type': 'text/html'}


@app.route('/render', methods=['POST'])
def render_template():
    data = request.get_json(force=True, silent=True) or {}
    user_input = data.get('input', '')

    # DELIBERATELY VULNERABLE: passes user input directly to Mako Template
    # constructor and calls .render() on it. Mako evaluates ${expr} blocks as
    # arbitrary Python expressions, and <% code %> blocks as Python statements.
    # Mako does NOT sandbox Python: any Python builtin or importable module is
    # accessible. Attack payloads:
    #
    #   ${7*7}                                   -> 49 (detection)
    #   ${self.__class__}                         -> Mako class (fingerprint)
    #   ${self.module}                            -> compiled module object
    #   ${self.module.__dict__}                   -> module dict
    #   ${__import__('os').popen('id').read()}    -> RCE via import
    #   <%! import os %> ${os.popen('id').read()} -> module-level import + RCE
    try:
        result = Template(user_input).render()
        # Mako .render() returns bytes or str; ensure str
        if isinstance(result, bytes):
            result = result.decode('utf-8', errors='replace')
        return jsonify({
            "output": result,
            "engine": "mako",
            "mode": "vulnerable"
        })
    except Exception as e:
        return jsonify({
            "output": str(e),
            "engine": "mako",
            "mode": "vulnerable",
            "error": True
        })


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "engine": "mako",
        "mode": "vulnerable",
        "port": 5003
    })


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5003, debug=False)
