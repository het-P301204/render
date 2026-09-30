# Security Policy

## Scope

RENDER is a **local, authorized security research lab** for studying Server-Side Template Injection (SSTI) vulnerabilities.

**This project is designed exclusively for:**
- Educational research on SSTI vulnerability classes
- Understanding template engine attack surfaces
- Demonstrating vulnerable vs. hardened code patterns
- Controlled, authorized penetration testing lab environments
- Security professionals learning SSTI exploitation techniques

## Authorized Use

All vulnerable applications in `apps/` are **intentionally vulnerable by design** and must only be run on:
- Your local machine (127.0.0.1 / localhost)
- An isolated lab network you own and control
- A virtualized environment with no external access

## Prohibited Use

Do not use RENDER to:
- Attack systems you do not own or have explicit written permission to test
- Scan internet-facing systems
- Exploit production applications
- Perform unauthorized research on third-party services

## Responsible Disclosure

If you find a security issue in RENDER itself (e.g., the CLI or API server has an unintended vulnerability that could affect users outside the lab), please open a GitHub issue marked `[SECURITY]`.

## Isolation Requirements

- Vulnerable lab servers bind to `127.0.0.1` only — never `0.0.0.0`
- Do not expose lab ports through firewalls or reverse proxies
- The API server is intended for local use only
- Do not deploy any component of RENDER to internet-accessible infrastructure

## Reporting

Report security concerns to the project maintainer via GitHub Issues with the `security` label.
