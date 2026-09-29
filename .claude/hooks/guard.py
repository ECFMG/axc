#!/usr/bin/env python3
"""PreToolUse guard: blocks destructive commands and protected-path writes.

Zero tokens, never ignored. This replaces every "please don't ever..."
line you would otherwise pay for in CLAUDE.md on every single request.

Wire to: PreToolUse, matcher "Bash|Edit|Write|NotebookEdit"
"""
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import read_event, load_config, deny, ask, allow, vault_log  # noqa: E402

EVENT = "PreToolUse"

DEFAULTS = {"bash_deny": [], "bash_ask": [], "path_deny": []}



def strip_heredocs(cmd):
    """Remove INERT heredoc bodies so deny rules match commands, not documents.

    `cat > adr.md <<'EOF' ... EOF` writes text; the text is data, and matching
    rules against it produced real false positives — an architecture decision
    record mentioning an HTTP verb was blocked as an external call, costing a
    measured evaluation run several turns.

    Only heredocs with a QUOTED or ESCAPED delimiter are stripped. With an
    unquoted delimiter bash performs command substitution on the body, so
    `<<EOF` containing $(curl ...) is a live command and MUST stay visible to
    the rules. Stripping those would turn this guard into a bypass.
    """
    if "<<" not in cmd:
        return cmd
    out = []
    lines = cmd.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        out.append(line)
        i += 1
        # Quoted or escaped delimiter only: <<'E'  <<"E"  <<\E  (and <<- forms)
        m = re.search(r"<<-?\s*(?:'([A-Za-z_][A-Za-z0-9_]*)'"
                      r"|\"([A-Za-z_][A-Za-z0-9_]*)\""
                      r"|\\\\([A-Za-z_][A-Za-z0-9_]*))", line)
        if not m:
            continue
        term = m.group(1) or m.group(2) or m.group(3)
        while i < len(lines) and lines[i].strip() != term:
            i += 1
        i += 1  # drop the terminator too
    return "\n".join(out)

def main():
    event = read_event()
    tool = event.get("tool_name", "")
    ti = event.get("tool_input", {}) or {}
    cfg = load_config("guard.config.json", DEFAULTS)

    if tool == "Bash":
        raw = ti.get("command", "") or ""
        # Match against the command, not against any document it writes.
        cmd = strip_heredocs(raw)
        for pattern, reason in cfg.get("bash_deny", []):
            try:
                if re.search(pattern, cmd, re.I):
                    vault_log("guard", f"BLOCKED `{cmd[:120]}` — {reason}")
                    deny(EVENT, f"Blocked by guard hook: {reason} "
                                f"Ask the user to run it themselves.")
            except re.error:
                continue
        for pattern, reason in cfg.get("bash_ask", []):
            try:
                if re.search(pattern, cmd, re.I):
                    ask(EVENT, f"Guard hook wants confirmation: {reason}")
            except re.error:
                continue

    elif tool in ("Edit", "Write", "NotebookEdit"):
        path = ti.get("file_path") or ti.get("notebook_path") or ""
        norm = path.replace("\\", "/")

        # SRD Allowed Write Boundary: when boundary globs are configured, any
        # write outside them is denied. Boundary violations are a scored
        # Security input in the evaluation rubric, so this fails closed.
        # Per-agent persona boundary (ACH architecture: an agent's persona is
        # "definition, tools, persona (model spec, permitted files)"). The
        # PreToolUse payload carries agent_type when the call comes from a
        # subagent; absent for the main agent. A subagent's own globs REPLACE
        # the task boundary rather than widening it — a persona can only ever
        # be narrower than the sandbox it runs in.
        agent = event.get("agent_type") or ""
        boundary = cfg.get("allowed_write_globs") or []
        per_agent = (cfg.get("agent_write_globs") or {}).get(agent)
        if per_agent is not None:
            if boundary:
                import fnmatch as _fn
                widened = [g for g in per_agent
                           if not any(_fn.fnmatch(g, b) or g == b for b in boundary)]
                if widened:
                    vault_log("guard", f"persona `{agent}` tried to widen boundary: {widened}")
            boundary = (per_agent if not boundary
                        else [g for g in per_agent if g not in (widened or [])])
            # An empty persona means "writes nothing", which is NOT the same as
            # an unset boundary meaning "no restriction configured". Without
            # this, a read-only agent would be allowed everywhere.
            if not boundary:
                vault_log("guard", f"persona `{agent}` is read-only; write denied")
                deny(EVENT, f"Subagent `{agent}` has a read-only persona: it is "
                            f"permitted no write paths at all. Return your "
                            f"findings to the caller instead of writing files.")
        if boundary:
            import fnmatch
            from _common import project_dir
            rel = norm
            root = project_dir(event).replace("\\", "/").rstrip("/")
            if rel.startswith(root + "/"):
                rel = rel[len(root) + 1:]
            if not any(fnmatch.fnmatch(rel, g) for g in boundary):
                who = f"persona `{agent}`" if agent else "main agent"
                vault_log("guard", f"BOUNDARY violation blocked ({who}): `{rel}`")
                deny(EVENT, f"Outside the allowed write boundary for "
                            f"{'subagent ' + agent if agent else 'this evaluation'}"
                            f": {rel}. Writable globs: "
                            f"{', '.join(boundary[:6])}. Boundary violations "
                            f"are scored — do the work inside the boundary or "
                            f"tell the user why it cannot be done there.")
        for pattern, reason in cfg.get("path_deny", []):
            try:
                if re.search(pattern, norm, re.I):
                    vault_log("guard", f"BLOCKED write to `{path}` — {reason}")
                    deny(EVENT, f"Blocked by guard hook: {reason} "
                                f"Path: {path}")
            except re.error:
                continue
        for pattern, reason in cfg.get("path_ask", []):
            try:
                if re.search(pattern, norm, re.I):
                    ask(EVENT, f"Guard hook wants confirmation: {reason}")
            except re.error:
                continue

    allow()


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # A broken guard must never brick the session.
        sys.exit(0)
