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
With --stop it is a Stop hook: blocks finishing (at most MAX_BLOCKS times per
session, then allows it) while the shape is wrong. Agents never ran the advisory
check (0 of 16 runs in iterations 8-9), and one run shipped flat domain code.

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


MAX_BLOCKS = 2


def check(root):
    """(problems, aggregate count); problems is None when nothing changed yet."""
    c = cfg()
    pr = c["packages_root"].rstrip("/") + "/"
    files = [f for f in changed_files(root) if f.startswith(pr) and "/src/" in f and f.endswith(".ts")]
    if not files:
        return None, 0
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

    # Test depth (Cellix colocated-test convention): every new source module has
    # a <name>.test.ts beside it. index.ts barrels and *.d.ts are exempt.
    def runtime_code(f):
        """True if the file has runtime code; pure interface/type files need no test."""
        try:
            src = re.sub(r"/\*.*?\*/|//[^\n]*", "", open(os.path.join(root, f), errors="replace").read(), flags=re.S)
        except Exception:
            return True
        src = re.sub(r"^\s*import\s.*$", "", src, flags=re.M)
        return bool(re.search(r"\b(function|class|const|let|var|enum)\b|=>", src))
    untested = [f for f in files if not f.endswith((".test.ts", ".d.ts")) and os.path.basename(f) != "index.ts"
                and not re.search(r"(seed|fixture)", os.path.basename(f))
                and not os.path.exists(os.path.join(root, f[:-3] + ".test.ts")) and runtime_code(f)]
    if untested:
        problems.append("modules without a colocated <name>.test.ts: " + ", ".join(untested))

    if not any(f.startswith(pr + "rest/src/") and f.endswith(".test.ts") for f in files):
        problems.append(f"no rest unit test under {pr}rest/src/*.test.ts")

    return problems, len(aggs)


def main():
    root = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    problems, n = check(root)
    if problems is None:
        print("cellix check: no changed source under " + cfg()["packages_root"] + " yet")
    elif problems:
        print("cellix check: NOT Cellix-shaped yet - fix before finishing:")
        for p in problems:
            print("  - " + p)
    else:
        print(f"cellix check: OK - {n} aggregate(s) in Cellix shape, all layers, rest tested")


def stop():
    ev = json.loads(sys.stdin.read() or "{}")
    problems, _ = check(os.environ.get("CLAUDE_PROJECT_DIR") or ev.get("cwd") or os.getcwd())
    if not problems:
        return
    state = os.path.join(os.path.expanduser("~"), ".claude", "metrics", "cellix-gate.json")
    os.makedirs(os.path.dirname(state), exist_ok=True)
    st = json.load(open(state)) if os.path.exists(state) else {}
    sid = ev.get("session_id", "?")
    blocks = st.get(sid, 0)
    if blocks >= MAX_BLOCKS:
        return
    st[sid] = blocks + 1
    json.dump(st, open(state, "w"))
    print(json.dumps({"decision": "block", "reason":
        "Not Cellix-shaped yet (reviewers fail this):\n" + "\n".join("- " + p for p in problems) +
        "\nMove the code into that shape, update imports, rerun the affected tests and the full gate, "
        f"then finish. (Block {blocks + 1} of {MAX_BLOCKS}.)"}))


if __name__ == "__main__":
    try:
        stop() if "--stop" in sys.argv else main()
    except Exception as e:  # fail open
        if "--stop" not in sys.argv:
            print(f"cellix check unavailable ({e})")
    sys.exit(0)
