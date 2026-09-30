"""
RENDER Platform — Jinja2 Lab: HARDENED mode (port 5002)
========================================================
HARDENED: This app rejects template syntax in user input and treats all
user-supplied text as data, never as template code.
"""

import re

from flask import Flask, request, jsonify
from flask_cors import CORS
from jinja2 import Environment, select_autoescape

app = Flask(__name__)
CORS(app)

# HARDENED: Use an Environment with autoescaping enabled.
# User input is passed as a variable value, never as template source.
env = Environment(autoescape=select_autoescape(['html', 'xml']))

# HARDENED: Regex to detect any Jinja2 template delimiters in user input.
# Blocks {{ }}, {% %}, {# #}
TEMPLATE_SYNTAX_PATTERN = re.compile(r'\{\{|\}\}|\{%|%\}|\{#|#\}')


@app.route('/')
def index():
    return """
    <html>
    <head><title>RENDER — Jinja2 Lab (Hardened)</title></head>
    <body style="font-family:monospace;background:#1a1a1a;color:#44ff44;padding:2em">
    <h1>RENDER — Jinja2 Lab</h1>
    <p><b>Mode:</b> HARDENED</p>
    <p><b>Port:</b> 5002</p>
    <p><b>Engine:</b> Jinja2</p>
    <p><b>Fix:</b> Template syntax rejected; input passed as data variable</p>
    <p><b>POST /render</b> — { "input": "&lt;template_string&gt;" }</p>
    <p><b>GET /health</b> — health check</p>
    </body></html>
    """, 200, {'Content-Type': 'text/html'}


@app.route('/render', methods=['POST'])
def render_template():
    data = request.get_json(force=True, silent=True) or {}
    user_input = data.get('input', '')

    # HARDENED: Reject any input containing Jinja2 template delimiters.
    # This prevents the user from injecting template expressions.
    if TEMPLATE_SYNTAX_PATTERN.search(user_input):
        return jsonify({
            "output": "[BLOCKED: Template syntax detected in input]",
            "engine": "jinja2",
            "mode": "hardened",
            "blocked": True
        })

    # HARDENED: Use a static template where the user's text is passed as
    # a named variable, never evaluated as template source code.
    template = env.from_string("User input: {{ value }}")
    result = template.render(value=user_input)
    return jsonify({
        "output": result,
        "engine": "jinja2",
        "mode": "hardened"
    })


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "engine": "jinja2",
        "mode": "hardened",
        "port": 5002
    })


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5002, debug=False)
