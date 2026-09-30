"""
RENDER Platform — Stop All Lab Servers
=======================================
Kills all lab server processes by port number.
Works on Windows and Unix.

Usage: python stop_all.py
"""

import os
import subprocess
import sys

PORTS = [5001, 5002, 3001, 3002, 5003, 5004]

PORT_LABELS = {
    5001: "Jinja2 Vulnerable",
    5002: "Jinja2 Hardened",
    3001: "Node Vulnerable",
    3002: "Node Hardened",
    5003: "Mako Vulnerable",
    5004: "Mako Hardened",
}


def kill_port_windows(port):
    """Kill process listening on a port on Windows."""
    try:
        result = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True, text=True
        )
        pids = set()
        for line in result.stdout.splitlines():
            if f":{port} " in line and ("LISTENING" in line or "ESTABLISHED" in line):
                parts = line.split()
                if parts:
                    pids.add(parts[-1])
        for pid in pids:
            try:
                subprocess.run(["taskkill", "/F", "/PID", pid], capture_output=True)
            except Exception:
                pass
        return bool(pids)
    except Exception as e:
        print(f"    Error: {e}")
        return False


def kill_port_unix(port):
    """Kill process listening on a port on Unix/Mac."""
    try:
        result = subprocess.run(
            ["lsof", "-ti", f"tcp:{port}"],
            capture_output=True, text=True
        )
        pids = result.stdout.strip().split()
        for pid in pids:
            try:
                subprocess.run(["kill", "-9", pid], capture_output=True)
            except Exception:
                pass
        return bool(pids)
    except Exception as e:
        print(f"    Error: {e}")
        return False


def main():
    print("=" * 60)
    print("RENDER Platform — Stopping All Lab Servers")
    print("=" * 60)

    is_windows = sys.platform.startswith('win')

    for port in PORTS:
        label = PORT_LABELS.get(port, str(port))
        print(f"  Killing port {port} ({label})...", end=" ")
        if is_windows:
            found = kill_port_windows(port)
        else:
            found = kill_port_unix(port)
        print("done" if found else "not running")

    print()
    print("All lab servers stopped.")
    print("=" * 60)


if __name__ == '__main__':
    main()
