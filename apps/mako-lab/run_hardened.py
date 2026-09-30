"""Start the Mako hardened lab on port 5004."""
import subprocess
import sys
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
subprocess.run(
    [sys.executable, os.path.join(script_dir, 'hardened_app.py')],
    check=True
)
