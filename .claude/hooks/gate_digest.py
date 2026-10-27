#!/usr/bin/env python3
"""Run the full gate once and print a compact digest: exit code, each gate step,
turbo task totals, test and scenario counts, SKIPPED lines, and on failure the
failing step's error lines. Full log stays at /tmp/verify.log for anything else.
Usage: python3 .claude/hooks/gate_digest.py [gate command...]  (default: pnpm run verify)"""
import os, re, subprocess, sys

LOG = "/tmp/verify.log"
ANSI = re.compile(r"\x1b\[[0-9;]*m")
NOISE = re.compile(r"snyk monitor|DeprecationWarning|trace-deprecation|Tested \d+ dependencies|^✔ Tested /|^Next steps")


def digest(lines, code):
    out = [f"gate EXIT={code}  (full log: {LOG})"]
    steps = [i for i, l in enumerate(lines) if l.startswith("$ ")][1:]  # [0] is the chain itself
    for n, i in enumerate(steps):
        end = steps[n + 1] if n + 1 < len(steps) else len(lines)
        failed = code != 0 and n == len(steps) - 1
        body = lines[i + 1:end]
        out.append(f"{'FAIL' if failed else 'ok  '} {lines[i][2:][:90]}")
        for l in body:
            s = l.strip()
            if NOISE.search(s):
                continue
            if re.match(r"(Tasks|Failed):\s", s) or re.search(r"\bTests\s+\d+ (passed|failed)|Scenarios:|Steps:|\d+ scenarios? \(|skipp", s, re.I) \
                    or re.search(r"\d+ vulnerabilit|no vulnerable paths", s):
                out.append("     " + re.sub(r"\s+", " ", s)[:140])
        if failed:
            errs = [l.strip() for l in body if re.search(r"error|✗|×|FAIL|Unused|not ok|ERR_", l, re.I) and not NOISE.search(l)]
            out.append("     -- error lines --")
            out += ["     " + e[:200] for e in errs[:30]]
            out.append("     -- tail --")
            out += ["     " + l.strip()[:200] for l in body[-15:] if l.strip()]
    if not steps:  # single command gate: no '$ ' markers
        out += [l[:200] for l in lines[-40:]]
    seen, uniq = set(), []
    for l in out:  # snyk repeats the same line per project
        if l not in seen or l.startswith(("ok", "FAIL")):
            uniq.append(l)
        seen.add(l)
    return "\n".join(uniq)


def main():
    cmd = sys.argv[1:] or ["corepack", "pnpm", "run", "verify"]
    root = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    with open(LOG, "w") as f:
        code = subprocess.run(cmd, cwd=root, stdout=f, stderr=subprocess.STDOUT).returncode
    lines = ANSI.sub("", open(LOG, errors="replace").read()).splitlines()
    print(digest(lines, code))
    sys.exit(code)


if __name__ == "__main__":
    main()
