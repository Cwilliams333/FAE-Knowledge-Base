#!/usr/bin/env python3
"""
Wrapper script for ingest.py that creates health check markers
"""
import os
import sys
import time
import subprocess
from pathlib import Path

MARKER_DIR = Path("/app/status")
MARKER_FILE = MARKER_DIR / "ingest_complete"

def update_health_marker():
    """Update the health check marker file"""
    MARKER_DIR.mkdir(parents=True, exist_ok=True)
    MARKER_FILE.touch()
    print(f"✓ Updated health marker: {MARKER_FILE}")

def run_ingest():
    """Run the ingest.py script and update health marker on success"""
    try:
        # Run ingest.py with all arguments passed through
        result = subprocess.run(
            [sys.executable, "ingest.py"] + sys.argv[1:],
            check=False,
            capture_output=False
        )
        
        # Update marker only if ingest completed successfully
        if result.returncode == 0:
            update_health_marker()
        
        return result.returncode
        
    except Exception as e:
        print(f"Error running ingest: {e}")
        return 1

if __name__ == "__main__":
    # If watch mode is enabled, update marker periodically
    if "--watch" in sys.argv or os.getenv('WATCH_MODE', 'false').lower() == 'true':
        # Initial run
        exit_code = run_ingest()
        
        # In watch mode, the ingest.py script handles the loop
        # We just need to periodically update the health marker
        while True:
            time.sleep(30)
            update_health_marker()
    else:
        # Single run mode
        exit_code = run_ingest()
        sys.exit(exit_code)