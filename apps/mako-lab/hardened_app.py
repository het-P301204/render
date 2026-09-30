"""
RENDER Platform — Mako Lab: HARDENED mode (port 5004)
======================================================
HARDENED: This app rejects Mako template syntax in user input and treats all
user-supplied text as data, never as template code.
"""

import re

from flask import Flask, request, jsonify
from flask_cors import CORS
from mako.template import Template
from mako.lookup import TemplateLookup

app = Flask(__name__)
CORS(app)

# HARDENED: Pattern to detect Mako template delimiters in user input.
# Blocks: ${...}  <%...%>  <%!...%>  <%def...>  <%namespace...>  ## comments
MAKO_SYNTAX_PATTERN = re.compile(
    r'\$\{|<%|%>|</%|<%!|<%def|<%namespace|<%include|<%inherit|##'
)

# HARDENED: Static template for rendering user input as a data variable.
# module_directory=None prevents Mako from writing compiled modules to disk.
# strict_undefined=True raises on undefined variables (no silent probing).
_STATIC_TEMPLATE = Template(
    "User input: ${value | h}",
    strict_undefined=True,
    module_directory=None,
    filesystem_checks=False,
)


@app.route('/')
def index():
    return """
    <html>
    <head><title>RENDER — Mako Lab (Hardened)</title></head>
    <body style="font-family:monospace;background:#1a1a1a;color:#44ff44;padding:2em">
    <h1>RENDER — Mako Lab</h1>
    <p><b>Mode:</b> HARDENED</p>
    <p><b>Port:</b> 5004</p>
    <p><b>Engine:</b> Mako</p>
    <p><b>Fix:</b> Template syntax rejected; input passed as data variable with HTML escaping</p>
    <p><b>POST /render</b> — { "input": "&lt;template_string&gt;" }</p>
    <p><b>GET /health</b> — health check</p>
    </body></html>
    """, 200, {'Content-Type': 'text/html'}


@app.route('/render', methods=['POST'])
def render_template():
    data = request.get_json(force=True, silent=True) or {}
    user_input = data.get('input', '')

    # HARDENED: Reject any input containing Mako template delimiters.
    # ${, <%, %>, <%!, ## are all Mako syntax markers.
    if MAKO_SYNTAX_PATTERN.search(user_input):
        return jsonify({
            "output": "[BLOCKED: Mako template syntax detected in input]",
            "engine": "mako",
            "mode": "hardened",
            "blocked": True
        })

    # HARDENED: Use a pre-compiled static template where the user's text is
    # passed as the 'value' variable. The | h filter HTML-escapes the output.
    # User input is never compiled or evaluated as Mako template source.
    try:
        result = _STATIC_TEMPLATE.render(value=user_input)
        if isinstance(result, bytes):
            result = result.decode('utf-8', errors='replace')
        return jsonify({
            "output": result,
            "engine": "mako",
            "mode": "hardened"
        })
    except Exception as e:
        return jsonify({
            "output": str(e),
            "engine": "mako",
            "mode": "hardened",
            "error": True
        })


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "engine": "mako",
        "mode": "hardened",
        "port": 5004
    })


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5004, debug=False)
