#!/usr/bin/env python3
"""Stop hook + self-check CLI: refuse to finish while the working tree's
changes contain a high-confidence secret (cloud keys, private-key blocks,
platform tokens).

The repo's own gates (audit, snyk, script-policy) scan dependencies, not
committed content; the PreToolUse guard cannot see heredoc bodies (it strips
them to avoid false positives). Diffed/untracked file bytes are the one place
a written secret must appear, so this scans those. High-signal patterns only -
no generic key=value heuristics, which false-positive on JWT/test fixtures.

Also runnable as `python3 .claude/hooks/secret_gate.py --check` (read-only,
exit 0). Max MAX_BLOCKS blocks per session, then allows stop with a warning.
Fail-open on any error. Wire to: Stop.
"""
import json, os, re, subprocess, sys

MAX_BLOCKS = 2
PATTERNS = [
    ("AWS access key id", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b")),
    ("private key block", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("GitHub token", re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{22,}\b")),
    ("Slack token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b")),
    ("Anthropic key", re.compile(r"\bsk-ant-[A-Za-z0-9_-]{20,}\b")),
]
SKIP_DIRS = ("node_modules/", ".git/", ".turbo/", "dist/")

def hits(root):
    found = []  # (where, pattern name)
    try:
        diff = subprocess.run(["git", "diff", "HEAD"], cwd=root, capture_output=True,
                              text=True, errors="replace", timeout=30).stdout
    except Exception:
        diff = ""
    for name, rx in PATTERNS:
        if rx.search(diff):
            found.append(("tracked diff", name))
    try:
        out = subprocess.run(["git", "ls-files", "--others", "--exclude-standard"],
                             cwd=root, capture_output=True, text=True, errors="replace",
                             timeout=30).stdout.splitlines()
    except Exception:
        out = []
    for f in out:
        if any(s in f for s in SKIP_DIRS):
            continue
        p = os.path.join(root, f)
        try:
            if os.path.getsize(p) > 1_000_000:
                continue
            body = open(p, errors="replace").read()
        except Exception:
            continue
        for name, rx in PATTERNS:
            if rx.search(body):
                found.append((f, name))
    return found

def main():
    try:
        ev = json.loads(sys.stdin.read() or "{}")
    except Exception:
        return
    root = os.environ.get("CLAUDE_PROJECT_DIR") or ev.get("cwd") or os.getcwd()
    found = hits(root)
    if not found:
        return

    state = os.path.join(os.path.expanduser("~"), ".claude", "metrics", "secret-gate.json")
    try:
        os.makedirs(os.path.dirname(state), exist_ok=True)
        st = json.load(open(state)) if os.path.exists(state) else {}
    except Exception:
        st = {}
    sid = ev.get("session_id", "?")
    blocks = int(st.get(sid, 0))
    listing = "\n".join(f"- {where}: {name}" for where, name in found[:10])
    if blocks >= MAX_BLOCKS:
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "Stop", "additionalContext":
              f"Secret gate: possible secrets still present after {MAX_BLOCKS} blocks; allowing stop. "
              f"State this explicitly in your summary:\n{listing}"}}))
        return
    st[sid] = blocks + 1
    try:
        json.dump(st, open(state, "w"))
    except Exception:
        pass
    print(json.dumps({"decision": "block", "reason":
        f"Possible secret(s) in your changes - remove or replace with placeholders before finishing:\n{listing}\n"
        f"Verify with `python3 .claude/hooks/secret_gate.py --check`. (Block {blocks + 1} of {MAX_BLOCKS}.)"}))

if __name__ == "__main__":
    if "--check" in sys.argv:
        found = hits(os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd())
        print("\n".join(f"{w}: {n}" for w, n in found) or "no secrets detected")
        sys.exit(0)
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
