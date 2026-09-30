"""Start the Mako vulnerable lab on port 5003."""
import subprocess
import sys
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
subprocess.run(
    [sys.executable, os.path.join(script_dir, 'vulnerable_app.py')],
    check=True
)
