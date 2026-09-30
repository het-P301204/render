"""
RENDER Platform — Jinja2 Lab: VULNERABLE mode (port 5001)
==========================================================
DELIBERATELY VULNERABLE: This app renders user input directly as a Jinja2
template, enabling Server-Side Template Injection (SSTI).
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from jinja2 import Template

app = Flask(__name__)
CORS(app)


@app.route('/')
def index():
    return """
    <html>
    <head><title>RENDER — Jinja2 Lab (Vulnerable)</title></head>
    <body style="font-family:monospace;background:#1a1a1a;color:#ff4444;padding:2em">
    <h1>RENDER — Jinja2 Lab</h1>
    <p><b>Mode:</b> VULNERABLE</p>
    <p><b>Port:</b> 5001</p>
    <p><b>Engine:</b> Jinja2</p>
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

    # DELIBERATELY VULNERABLE: passes user input directly to Jinja2 Template
    # constructor. The user controls the template syntax, enabling arbitrary
    # expression evaluation such as:
    #   {{7*7}}                          -> 49  (detection)
    #   {{config}}                       -> Flask config dump (fingerprint)
    #   {{self.__class__.__mro__}}       -> class traversal (escape)
    #   {{''.class.mro()[1].subclasses() -> access builtins (RCE path)
    try:
        result = Template(user_input).render()
        return jsonify({
            "output": result,
            "engine": "jinja2",
            "mode": "vulnerable"
        })
    except Exception as e:
        return jsonify({
            "output": str(e),
            "engine": "jinja2",
            "mode": "vulnerable",
            "error": True
        })


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "engine": "jinja2",
        "mode": "vulnerable",
        "port": 5001
    })


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=False)
