"""
RENDER Platform — Start All Lab Servers
========================================
Starts all 6 lab servers as separate subprocesses:
  - Jinja2 vulnerable  (port 5001)
  - Jinja2 hardened    (port 5002)
  - Node vulnerable    (port 3001)  [Handlebars + Nunjucks]
  - Node hardened      (port 3002)  [Handlebars + Nunjucks]
  - Mako vulnerable    (port 5003)
  - Mako hardened      (port 5004)

Usage: python start_all.py
Press Ctrl+C to stop all servers.
"""

import os
import subprocess
import sys
import time
import signal

APPS_DIR = os.path.dirname(os.path.abspath(__file__))

# Server definitions: (label, command_list, port, cwd)
SERVERS = [
    {
        "label": "Jinja2 Vulnerable (5001)",
        "cmd": [sys.executable, os.path.join(APPS_DIR, "jinja-lab", "vulnerable_app.py")],
        "cwd": os.path.join(APPS_DIR, "jinja-lab"),
        "port": 5001,
    },
    {
        "label": "Jinja2 Hardened  (5002)",
        "cmd": [sys.executable, os.path.join(APPS_DIR, "jinja-lab", "hardened_app.py")],
        "cwd": os.path.join(APPS_DIR, "jinja-lab"),
        "port": 5002,
    },
    {
        "label": "Node Vulnerable  (3001)",
        "cmd": ["node", os.path.join(APPS_DIR, "node-lab", "vulnerable_app.js")],
        "cwd": os.path.join(APPS_DIR, "node-lab"),
        "port": 3001,
    },
    {
        "label": "Node Hardened    (3002)",
        "cmd": ["node", os.path.join(APPS_DIR, "node-lab", "hardened_app.js")],
        "cwd": os.path.join(APPS_DIR, "node-lab"),
        "port": 3002,
    },
    {
        "label": "Mako Vulnerable  (5003)",
        "cmd": [sys.executable, os.path.join(APPS_DIR, "mako-lab", "vulnerable_app.py")],
        "cwd": os.path.join(APPS_DIR, "mako-lab"),
        "port": 5003,
    },
    {
        "label": "Mako Hardened    (5004)",
        "cmd": [sys.executable, os.path.join(APPS_DIR, "mako-lab", "hardened_app.py")],
        "cwd": os.path.join(APPS_DIR, "mako-lab"),
        "port": 5004,
    },
]

processes = []


def start_servers():
    print("=" * 60)
    print("RENDER Platform — Starting All Lab Servers")
    print("=" * 60)

    for srv in SERVERS:
        try:
            proc = subprocess.Popen(
                srv["cmd"],
                cwd=srv["cwd"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            processes.append((srv["label"], proc))
            print(f"  [STARTED] {srv['label']}  (pid={proc.pid})")
        except FileNotFoundError as e:
            print(f"  [FAILED]  {srv['label']}  — {e}")

    print()
    print("All servers launched. Waiting 2 seconds for startup...")
    time.sleep(2)

    # Quick aliveness check
    print()
    print("Aliveness check:")
    for label, proc in processes:
        ret = proc.poll()
        status = "RUNNING" if ret is None else f"EXITED (code {ret})"
        print(f"  [{status}] {label}")

    print()
    print("Press Ctrl+C to stop all servers.")
    print("=" * 60)


def stop_servers():
    print()
    print("Stopping all servers...")
    for label, proc in processes:
        if proc.poll() is None:
            proc.terminate()
            print(f"  [STOPPED] {label}")
    # Give processes time to terminate
    time.sleep(1)
    for label, proc in processes:
        if proc.poll() is None:
            proc.kill()
    print("All servers stopped.")


def main():
    start_servers()
    try:
        # Wait until user interrupts
        while True:
            time.sleep(5)
            # Check for unexpected exits
            for label, proc in processes:
                if proc.poll() is not None:
                    print(f"  [DIED] {label} exited unexpectedly")
    except KeyboardInterrupt:
        stop_servers()


if __name__ == '__main__':
    main()
