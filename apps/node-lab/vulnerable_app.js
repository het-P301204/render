/**
 * RENDER Platform — Node Lab: VULNERABLE mode (port 3001)
 * =========================================================
 * DELIBERATELY VULNERABLE: Both Handlebars and Nunjucks engines
 * compile/render user input directly as template source, enabling SSTI.
 */

'use strict';

const express = require('express');
const cors = require('cors');
const Handlebars = require('handlebars');
const nunjucks = require('nunjucks');

const app = express();
app.use(express.json());
app.use(cors());

// ─── Root page ────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send(`
    <html>
    <head><title>RENDER — Node Lab (Vulnerable)</title></head>
    <body style="font-family:monospace;background:#1a1a1a;color:#ff4444;padding:2em">
    <h1>RENDER — Node.js Lab</h1>
    <p><b>Mode:</b> VULNERABLE</p>
    <p><b>Port:</b> 3001</p>
    <p><b>Engines:</b> Handlebars, Nunjucks</p>
    <p><b>POST /render</b> or <b>POST /handlebars/render</b> — Handlebars engine</p>
    <p><b>POST /nunjucks/render</b> — Nunjucks engine</p>
    <p><b>GET /health</b> — health check</p>
    <hr/>
    <p style="color:#ff6666">&#9888; This server is intentionally insecure.</p>
    </body></html>
  `);
});

// ─── Handlebars — DELIBERATELY VULNERABLE ─────────────────────────────────────

function handleHandlebarsVulnerable(req, res) {
  const userInput = (req.body && req.body.input) ? req.body.input : '';

  // DELIBERATELY VULNERABLE: Handlebars.compile() treats user input as template
  // source. Handlebars partials and helpers registered on the global runtime
  // can be invoked. Prototype pollution via __proto__ access may also be
  // possible in older versions. Payload examples:
  //   {{this}}                          -> context dump
  //   {{constructor}}                   -> exposes constructor
  //   {{#with "s" as |string|}}...      -> block helpers
  try {
    const template = Handlebars.compile(userInput);
    const result = template({});
    res.json({ output: result, engine: 'handlebars', mode: 'vulnerable' });
  } catch (e) {
    res.json({ output: e.message, engine: 'handlebars', mode: 'vulnerable', error: true });
  }
}

app.post('/handlebars/render', handleHandlebarsVulnerable);

// Default /render also uses Handlebars
app.post('/render', handleHandlebarsVulnerable);

// ─── Nunjucks — DELIBERATELY VULNERABLE ───────────────────────────────────────

app.post('/nunjucks/render', (req, res) => {
  const userInput = (req.body && req.body.input) ? req.body.input : '';

  // DELIBERATELY VULNERABLE: nunjucks.renderString() compiles and renders
  // user input as a Nunjucks template. Nunjucks has Jinja2-like syntax and
  // exposes the Python-like object model in JS (prototype chain). Payloads:
  //   {{7*7}}                           -> 49 (detect)
  //   {{range.constructor("return global")()}}   -> access global
  //   {{loop.index}}                    -> context values
  //   {{"a".constructor.prototype}}     -> prototype chain
  try {
    const result = nunjucks.renderString(userInput, {});
    res.json({ output: result, engine: 'nunjucks', mode: 'vulnerable' });
  } catch (e) {
    res.json({ output: e.message, engine: 'nunjucks', mode: 'vulnerable', error: true });
  }
});

// ─── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'handlebars/nunjucks', mode: 'vulnerable', port: 3001 });
});

// ─── Start ─────────────────────────────────────────────────────────────────────

app.listen(3001, '127.0.0.1', () => console.log('Node vulnerable lab running on 127.0.0.1:3001'));
