#!/usr/bin/env python3
"""Agent-runnable Cellix-shape self-check on the current working tree.

Checks the code you have written this session (uncommitted + untracked files)
against the CellixJS house shapes reviewers judge as Cellix-level:
  - every domain aggregate lives in domain/src/domain/contexts/<ctx>/<agg>/
  - each aggregate folder has <agg>.aggregate.ts, <agg>.value-objects.ts,
    <agg>.repository.ts, index.ts, and a colocated <agg>.aggregate.test.ts
  - no new domain source files sit flat in domain/src/ (outside contexts/)
  - all four layers touched; a rest-layer unit test exists
Prints exactly what is missing, with the expected paths. Advisory: exit 0.

Paths come from cellix.config.json beside this file; defaults are axc's.
usage: python3 .claude/hooks/cellix_check.py
"""
import json, os, re, subprocess, sys

_DEFAULTS = {
    "packages_root": "packages/axc",
    "layers": ["domain", "persistence", "application-services", "rest"],
}


def cfg():
    try:
        c = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "cellix.config.json")))
    except Exception:
        c = {}
    return {**_DEFAULTS, **c}


def changed_files(root):
    out = subprocess.run(["git", "status", "--porcelain", "--untracked-files=all"],
                         cwd=root, capture_output=True, text=True).stdout
    files = []
    for line in out.splitlines():
        path = line[3:].split(" -> ")[-1].strip().strip('"')
        if path:
            files.append(path)
    return files


def main():
    root = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    c = cfg()
    pr = c["packages_root"].rstrip("/") + "/"
    files = [f for f in changed_files(root) if f.startswith(pr) and "/src/" in f and f.endswith(".ts")]
    if not files:
        print("cellix check: no changed source under " + pr + " yet")
        return
    problems = []
    layers = {f[len(pr):].split("/")[0] for f in files}
    missing_layers = [l for l in c["layers"] if l not in layers]
    if missing_layers:
        problems.append(f"layers not touched: {', '.join(missing_layers)}")

    dom = pr + "domain/src/"
    # Cellix keeps shared domain code above the aggregates (domain/src/domain/ and
    # contexts/<ctx>/ roots), so only files directly in domain/src/ are flat.
    flat = [f for f in files if f.startswith(dom) and not f.startswith(dom + "domain/")
            and os.path.basename(f) != "index.ts"]
    if flat:
        problems.append("domain files outside domain/src/domain/ (aggregates go in "
                        "domain/contexts/<ctx>/<agg>/, shared code in domain/src/domain/): " + ", ".join(flat))

    ctx_rx = re.compile(re.escape(dom) + r"domain/contexts/([^/]+)/([^/]+)/")
    aggs = {}
    for f in files:
        m = ctx_rx.match(f)
        if m:
            aggs.setdefault((m.group(1), m.group(2)), set()).add(os.path.basename(f))
    if not aggs and not flat and "domain" in layers:
        problems.append("no aggregate folder under " + dom + "domain/contexts/<ctx>/<agg>/")
    for (ctx, agg), names in sorted(aggs.items()):
        base = f"{dom}domain/contexts/{ctx}/{agg}/"
        need = [f"{agg}.aggregate.ts", f"{agg}.value-objects.ts", f"{agg}.repository.ts",
                "index.ts", f"{agg}.aggregate.test.ts"]
        miss = [n for n in need if n not in names
                and not os.path.exists(os.path.join(root, base, n))]
        if miss:
            problems.append(f"aggregate '{agg}' missing: " + ", ".join(base + n for n in miss))

    if not any(f.startswith(pr + "rest/src/") and f.endswith(".test.ts") for f in files):
        problems.append(f"no rest unit test under {pr}rest/src/*.test.ts")

    if problems:
        print("cellix check: NOT Cellix-shaped yet - fix before finishing:")
        for p in problems:
            print("  - " + p)
    else:
        print(f"cellix check: OK - {len(aggs)} aggregate(s) in Cellix shape, all layers, rest tested")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"cellix check unavailable ({e})")
    sys.exit(0)
