"""
RENDER Platform — Health Check
================================
Checks all 6 lab server health endpoints and reports status.

Usage: python check_health.py
"""

import json
import sys
import time
try:
    import urllib.request as urlreq
    import urllib.error as urlerr
except ImportError:
    print("ERROR: requires Python 3")
    sys.exit(1)

ENDPOINTS = [
    {"label": "Jinja2 Vulnerable", "url": "http://127.0.0.1:5001/health", "port": 5001},
    {"label": "Jinja2 Hardened  ", "url": "http://127.0.0.1:5002/health", "port": 5002},
    {"label": "Node Vulnerable  ", "url": "http://127.0.0.1:3001/health", "port": 3001},
    {"label": "Node Hardened    ", "url": "http://127.0.0.1:3002/health", "port": 3002},
    {"label": "Mako Vulnerable  ", "url": "http://127.0.0.1:5003/health", "port": 5003},
    {"label": "Mako Hardened    ", "url": "http://127.0.0.1:5004/health", "port": 5004},
]

OK    = "\033[92m OK \033[0m"
FAIL  = "\033[91mFAIL\033[0m"
WARN  = "\033[93mWARN\033[0m"


def check(endpoint):
    url = endpoint["url"]
    try:
        req = urlreq.Request(url, headers={"Accept": "application/json"})
        with urlreq.urlopen(req, timeout=3) as resp:
            body = resp.read().decode("utf-8")
            data = json.loads(body)
            expected_status = "ok"
            if data.get("status") == expected_status:
                return True, data
            else:
                return False, data
    except urlerr.URLError as e:
        return False, {"error": str(e)}
    except json.JSONDecodeError as e:
        return False, {"error": f"bad JSON: {e}"}
    except Exception as e:
        return False, {"error": str(e)}


def main():
    print()
    print("=" * 60)
    print("RENDER Platform — Lab Health Check")
    print("=" * 60)
    print()

    all_ok = True
    for ep in ENDPOINTS:
        ok, data = check(ep)
        if ok:
            engine = data.get("engine", "?")
            mode   = data.get("mode", "?")
            port   = data.get("port", "?")
            print(f"  [{OK}]  {ep['label']}  engine={engine}  mode={mode}  port={port}")
        else:
            all_ok = False
            err = data.get("error", json.dumps(data))
            print(f"  [{FAIL}]  {ep['label']}  — {err}")

    print()
    if all_ok:
        print("  All 6 servers are healthy.")
    else:
        print("  One or more servers are not responding.")
        print("  Run: python start_all.py  to start all servers.")
    print()
    print("=" * 60)
    return 0 if all_ok else 1


if __name__ == '__main__':
    sys.exit(main())
