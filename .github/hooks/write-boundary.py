#!/usr/bin/env python3
"""Zero-token write-boundary guard for Copilot CLI preToolUse payloads.

Reads JSON from stdin (same shape as enforce-agent-workflow.sh).
On deny: prints permissionDecision JSON to stdout and exits 0.
On allow / non-applicable: prints nothing and exits 0.
Fail-open on parse errors so a broken guard never bricks a session.

Quoted/escaped heredoc bodies are stripped before bash_deny matching so
deny rules see the command, not inert document text (avoids FP token burn).
Unquoted heredocs stay visible — bash may expand $(...) inside them.
"""

from __future__ import annotations

import fnmatch
import json
import re
import sys
from pathlib import Path

WRITE_TOOLS = frozenset({
    "create",
    "edit",
    "write",
    "write_file",
    "create_file",
    "apply_patch",
    "applypatch",
    "strreplace",
    "search_replace",
    "notebookedit",
    "notebook_edit",
    "delete",
    "remove",
})

BASH_TOOLS = frozenset({"execute", "bash", "shell"})

# Quoted or escaped delimiter only: <<'E'  <<"E"  <<\E  (and <<- forms)
_HEREDOC_QUOTED = re.compile(
    r"<<-?\s*(?:'([A-Za-z_][A-Za-z0-9_]*)'"
    r"|\"([A-Za-z_][A-Za-z0-9_]*)\""
    r"|\\([A-Za-z_][A-Za-z0-9_]*))"
)


def load_config() -> dict:
    cfg_path = Path(__file__).resolve().parent / "write-boundary.json"
    try:
        with cfg_path.open() as fh:
            return json.load(fh)
    except Exception:
        return {}


def deny(reason: str) -> None:
    print(json.dumps({
        "permissionDecision": "deny",
        "permissionDecisionReason": reason,
    }))
    raise SystemExit(0)


def tool_args(payload: dict) -> dict:
    raw = payload.get("toolArgs", {})
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except Exception:
            return {"_blob": raw}
    return raw if isinstance(raw, dict) else {"_blob": str(raw)}


def extract_paths(args: dict) -> list[str]:
    keys = (
        "path", "filePath", "file_path", "file", "uri",
        "notebook_path", "notebookPath", "target", "dest",
    )
    paths: list[str] = []
    for k in keys:
        v = args.get(k)
        if isinstance(v, str) and v.strip():
            paths.append(v.strip())
    files = args.get("files")
    if isinstance(files, list):
        for item in files:
            if isinstance(item, str):
                paths.append(item)
            elif isinstance(item, dict):
                for k in keys:
                    v = item.get(k)
                    if isinstance(v, str) and v.strip():
                        paths.append(v.strip())
    return paths


def strip_dot_slash(path: str) -> str:
    """Remove leading ./ only — do not strip the dot from .agents-work."""
    while path.startswith("./"):
        path = path[2:]
    return path


def strip_heredocs(cmd: str) -> str:
    """Drop inert quoted/escaped heredoc bodies; keep the opener line.

    Unquoted <<EOF bodies can run command substitution — leave them intact
    so bash_deny still sees live $(curl ...) / similar.
    """
    if "<<" not in cmd:
        return cmd
    out: list[str] = []
    lines = cmd.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        out.append(line)
        i += 1
        m = _HEREDOC_QUOTED.search(line)
        if not m:
            continue
        term = m.group(1) or m.group(2) or m.group(3)
        while i < len(lines) and lines[i].strip() != term:
            i += 1
        if i < len(lines):
            i += 1  # drop terminator
    return "\n".join(out)


def repo_relative(path: str, repo_root: Path) -> str:
    norm = path.replace("\\", "/")
    if norm.startswith("file://"):
        norm = norm[7:]
    try:
        p = Path(norm)
        if not p.is_absolute():
            return strip_dot_slash(norm)
        root = repo_root.resolve()
        try:
            return str(p.resolve().relative_to(root)).replace("\\", "/")
        except ValueError:
            abs_norm = str(p.resolve()).replace("\\", "/")
            root_s = str(root).replace("\\", "/")
            if abs_norm.startswith(root_s + "/"):
                return abs_norm[len(root_s) + 1:]
            return abs_norm
    except Exception:
        return strip_dot_slash(norm)


def in_boundary(rel: str, globs: list[str]) -> bool:
    rel = strip_dot_slash(rel)
    for g in globs:
        if fnmatch.fnmatch(rel, g):
            return True
        if g.endswith("/**") and (rel == g[:-3] or rel.startswith(g[:-2])):
            return True
    return False


def check_path_deny(rel: str, path_deny: list) -> str | None:
    for item in path_deny:
        if not isinstance(item, (list, tuple)) or len(item) < 2:
            continue
        pattern, reason = item[0], item[1]
        try:
            if re.search(pattern, rel, re.I):
                return reason
        except re.error:
            continue
    return None


def check_bash_deny(cmd: str, bash_deny: list) -> str | None:
    for item in bash_deny:
        if not isinstance(item, (list, tuple)) or len(item) < 2:
            continue
        pattern, reason = item[0], item[1]
        try:
            if re.search(pattern, cmd, re.I | re.M):  # per line: a newline can't hide a command
                return reason
        except re.error:
            continue
    return None


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return

    cfg = load_config()
    tool = str(payload.get("toolName", "")).strip().lower()
    args = tool_args(payload)
    repo_root = Path(__file__).resolve().parents[2]

    if tool in BASH_TOOLS:
        blob = args.get("command") or args.get("cmd") or args.get("_blob") or ""
        if isinstance(blob, list):
            blob = " ".join(str(x) for x in blob)
        # Match deny rules against the command, not inert heredoc documents.
        cmd = strip_heredocs(str(blob))
        reason = check_bash_deny(cmd, cfg.get("bash_deny") or [])
        if reason:
            deny(f"BLOCKED (write-boundary): {reason}")
        return

    if tool not in WRITE_TOOLS:
        return

    globs = cfg.get("allowed_write_globs") or []
    path_deny = cfg.get("path_deny") or []
    if not globs and not path_deny:
        return

    for raw_path in extract_paths(args):
        rel = repo_relative(raw_path, repo_root)
        denied = check_path_deny(rel, path_deny)
        if denied:
            deny(f"BLOCKED (write-boundary): {denied} Path: {rel}")
        if any(rel.startswith(p) for p in cfg.get("no_new_dirs") or []) and not (repo_root / rel).parent.is_dir():
            deny(f"BLOCKED (write-boundary): no new folders under packages/axc — add a flat file in an existing src/ folder. Path: {rel}")
        if globs and not in_boundary(rel, globs):
            sample = ", ".join(globs[:6])
            deny(
                f"BLOCKED (write-boundary): outside allowed write paths: {rel}. "
                f"Writable globs: {sample}. Stay inside the AXC write boundary."
            )


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        raise SystemExit(0)
