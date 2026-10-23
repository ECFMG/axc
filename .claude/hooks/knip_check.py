#!/usr/bin/env python3
"""Agent-runnable knip self-check: fast unused-export scan before finishing.
Mirrors the verify gate's knip step (same binary, same config) but scoped to
reporting; always exit 0 (advisory tool, not a gate - gates stay in verify).
Usage: python3 .claude/hooks/knip_check.py"""
import os, subprocess, sys

def main():
    root = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    try:
        r = subprocess.run(["corepack", "pnpm", "exec", "knip", "--reporter", "compact"],
                           cwd=root, capture_output=True, text=True, timeout=180)
    except Exception as e:
        print(f"knip self-check unavailable ({e}); rely on pnpm run verify")
        return
    out = (r.stdout or "") + (r.stderr or "")
    lines = [l for l in out.splitlines() if l.strip()]
    if r.returncode == 0:
        print("knip: clean - no unused exports or dependencies")
    else:
        print("knip found issues the verify gate will reject (fix before finishing):")
        for l in lines[:25]:
            print(" ", l)

if __name__ == "__main__":
    main()
    sys.exit(0)
