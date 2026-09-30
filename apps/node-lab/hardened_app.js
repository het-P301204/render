/**
 * RENDER Platform — Node Lab: HARDENED mode (port 3002)
 * ======================================================
 * HARDENED: Both engines treat user input as data, never as template source.
 * Prototype-pollution vectors are explicitly blocked.
 */

'use strict';

const express = require('express');
const cors = require('cors');
const Handlebars = require('handlebars');
const nunjucks = require('nunjucks');

const app = express();
app.use(express.json());
app.use(cors());

// ─── Handlebars — HARDENED setup ──────────────────────────────────────────────

// HARDENED: Create a sandboxed Handlebars runtime that forbids prototype access.
const hbsSandbox = Handlebars.create();

// Reject dangerous property names in user input (prototype pollution vectors)
const HBS_DANGER_PATTERN = /(__proto__|constructor|prototype)/i;

// ─── Nunjucks — HARDENED setup ────────────────────────────────────────────────

// HARDENED: Configure Nunjucks to use a no-filesystem environment.
// throwOnUndefined prevents leaking undefined properties that could be probed.
const nunjucksEnv = new nunjucks.Environment(null, {
  autoescape: true,
  throwOnUndefined: false
});

// Reject patterns that probe the object/prototype chain in Nunjucks
const NJK_DANGER_PATTERN = /(__class__|__mro__|__globals__|__builtins__|constructor|prototype|__proto__|\.constructor|range\.constructor|cycler\.constructor)/i;

// Generic template-syntax detector (shared)
const TEMPLATE_SYNTAX_PATTERN = /\{\{|\}\}|\{%|%\}|\{#|#\}/;

// ─── Root page ────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send(`
    <html>
    <head><title>RENDER — Node Lab (Hardened)</title></head>
    <body style="font-family:monospace;background:#1a1a1a;color:#44ff44;padding:2em">
    <h1>RENDER — Node.js Lab</h1>
    <p><b>Mode:</b> HARDENED</p>
    <p><b>Port:</b> 3002</p>
    <p><b>Engines:</b> Handlebars, Nunjucks</p>
    <p><b>POST /render</b> or <b>POST /handlebars/render</b> — Handlebars engine</p>
    <p><b>POST /nunjucks/render</b> — Nunjucks engine</p>
    <p><b>GET /health</b> — health check</p>
    </body></html>
  `);
});

// ─── Handlebars — HARDENED ────────────────────────────────────────────────────

function handleHandlebarsHardened(req, res) {
  const userInput = (req.body && req.body.input) ? req.body.input : '';

  // HARDENED: Reject inputs containing dangerous prototype-pollution keywords.
  if (HBS_DANGER_PATTERN.test(userInput)) {
    return res.json({
      output: '[BLOCKED: Dangerous property access detected in input]',
      engine: 'handlebars',
      mode: 'hardened',
      blocked: true
    });
  }

  // HARDENED: Use a static template; pass user input as a context variable.
  // The user's text is treated as data, not template source code.
  try {
    const template = hbsSandbox.compile('User input: {{value}}', {
      allowProtoPropertiesByDefault: false,
      allowProtoMethodsByDefault: false,
      strict: true,
      noEscape: false
    });
    // Pass user input as the 'value' context variable — never as template code
    const result = template({ value: userInput }, {
      allowProtoPropertiesByDefault: false,
      allowProtoMethodsByDefault: false
    });
    res.json({ output: result, engine: 'handlebars', mode: 'hardened' });
  } catch (e) {
    res.json({ output: e.message, engine: 'handlebars', mode: 'hardened', error: true });
  }
}

app.post('/handlebars/render', handleHandlebarsHardened);
app.post('/render', handleHandlebarsHardened);

// ─── Nunjucks — HARDENED ──────────────────────────────────────────────────────

app.post('/nunjucks/render', (req, res) => {
  const userInput = (req.body && req.body.input) ? req.body.input : '';

  // HARDENED: Block Nunjucks template syntax entirely.
  if (TEMPLATE_SYNTAX_PATTERN.test(userInput)) {
    return res.json({
      output: '[BLOCKED: Template syntax detected in input]',
      engine: 'nunjucks',
      mode: 'hardened',
      blocked: true
    });
  }

  // HARDENED: Block dangerous prototype/class access patterns.
  if (NJK_DANGER_PATTERN.test(userInput)) {
    return res.json({
      output: '[BLOCKED: Dangerous property access detected in input]',
      engine: 'nunjucks',
      mode: 'hardened',
      blocked: true
    });
  }

  // HARDENED: Render a static template with user input as a data variable.
  try {
    const result = nunjucksEnv.renderString('User input: {{ value }}', { value: userInput });
    res.json({ output: result, engine: 'nunjucks', mode: 'hardened' });
  } catch (e) {
    res.json({ output: e.message, engine: 'nunjucks', mode: 'hardened', error: true });
  }
});

// ─── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'handlebars/nunjucks', mode: 'hardened', port: 3002 });
});

// ─── Start ─────────────────────────────────────────────────────────────────────

app.listen(3002, '127.0.0.1', () => console.log('Node hardened lab running on 127.0.0.1:3002'));
