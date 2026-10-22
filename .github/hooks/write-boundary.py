#!/usr/bin/env python3
"""Zero-token write-boundary guard for Copilot CLI preToolUse payloads.

Reads JSON from stdin (same shape as enforce-agent-workflow.sh).
On deny: prints permissionDecision JSON to stdout and exits 0.
On allow / non-applicable: prints nothing and exits 0.
Fail-open on parse errors so a broken guard never bricks a session.

Quoted/escaped heredoc bodies are stripped before bash_deny matching so
deny rules see the command, not inert document text (avoids FP token burn).
Unquoted heredocs stay visible — bash may expand $(...) inside them.

Shell writes to protected paths are denied too (mirrors scripts/write-guard.mjs):
redirect/tee/sed -i/perl -i/cp/mv/install/ln/rsync/dd of=/truncate targets, and
interpreter code that calls a write API while naming a protected path literal.
Protected = path_deny match, or an existing repo file outside allowed_write_globs.
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


_HEREDOC_ANY = re.compile(r"<<-?\s*(?:'(\w+)'|\"(\w+)\"|\\?(\w+))")
_WRITE_CMDS = frozenset({"tee", "cp", "mv", "install", "ln", "rsync", "truncate", "dd", "sed", "perl"})
_PREFIXES = frozenset({"sudo", "env", "command", "exec", "nohup", "time", "xargs"})


def _drop_heredoc_bodies(cmd: str) -> str:
    out: list[str] = []
    lines = cmd.split("\n")
    i = 0
    while i < len(lines):
        out.append(lines[i])
        m = _HEREDOC_ANY.search(lines[i])
        i += 1
        if not m:
            continue
        end = m.group(1) or m.group(2) or m.group(3)
        while i < len(lines) and lines[i].strip() != end:
            i += 1
        i += 1
    return "\n".join(out)


def _lex(cmd: str) -> list[tuple[str, str]]:
    """Words (quotes removed) and ops: ('w', text) | ('>', '') | ('dup', '') | ('<', '') | (';', '')."""
    toks: list[tuple[str, str]] = []
    word: list[str] = []
    in_word = False
    i, n = 0, len(cmd)

    def flush() -> None:
        nonlocal word, in_word
        if in_word:
            toks.append(("w", "".join(word)))
        word, in_word = [], False

    while i < n:
        c = cmd[i]
        if c == "'":
            j = cmd.find("'", i + 1)
            j = n if j < 0 else j
            word.append(cmd[i + 1:j])
            in_word, i = True, j
        elif c == '"':
            j = i + 1
            while j < n and cmd[j] != '"':
                if cmd[j] == "\\" and j + 1 < n:
                    j += 1
                word.append(cmd[j])
                j += 1
            in_word, i = True, j
        elif c == "\\" and i + 1 < n:
            i += 1
            word.append(cmd[i])
            in_word = True
        elif c == ">" or (c == "&" and i + 1 < n and cmd[i + 1] == ">"):
            if "".join(word).isdigit():
                word, in_word = [], False
            flush()
            if c == "&":
                i += 1
            while i + 1 < n and cmd[i + 1] in ">|":
                i += 1
            if i + 1 < n and cmd[i + 1] == "&":
                i += 1
                toks.append(("dup", ""))
            else:
                toks.append((">", ""))
        elif c == "<":
            flush()
            while i + 1 < n and cmd[i + 1] in "<-":
                i += 1
            toks.append(("<", ""))
        elif c in ";&|()\n`":
            flush()
            toks.append((";", ""))
        elif c in " \t":
            flush()
        else:
            word.append(c)
            in_word = True
        i += 1
    flush()
    return toks


def _simple_commands(cmd: str) -> list[tuple[list[str], list[str]]]:
    cmds: list[tuple[list[str], list[str]]] = []
    argv: list[str] = []
    redirects: list[str] = []
    toks = _lex(_drop_heredoc_bodies(cmd))
    i = 0
    while i < len(toks):
        kind, val = toks[i]
        nxt = toks[i + 1] if i + 1 < len(toks) else None
        if kind == ";":
            cmds.append((argv, redirects))
            argv, redirects = [], []
        elif kind == ">" and nxt and nxt[0] == "w":
            redirects.append(nxt[1])
            i += 1
        elif kind in ("dup", "<") and nxt and nxt[0] == "w":
            i += 1
        elif kind == "w":
            argv.append(val)
        i += 1
    cmds.append((argv, redirects))
    return [c for c in cmds if c[0] or c[1]]


def _command_word(argv: list[str]) -> tuple[str, list[str]]:
    i = 0
    while i < len(argv) and (argv[i] in _PREFIXES or re.match(r"^\w+=", argv[i]) or (i > 0 and argv[i].startswith("-") and argv[i - 1] in _PREFIXES)):
        i += 1
    name = argv[i].split("/")[-1] if i < len(argv) else ""
    return name, argv[i + 1:]


def _in_place_files(name: str, args: list[str]) -> list[str]:
    flag = re.compile(r"^-[^-]*i|^--in-place" if name == "sed" else r"^-[^-]*i")
    if not any(flag.search(a) for a in args):
        return []
    files: list[str] = []
    script = False
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--":
            pass
        elif a.startswith("-") and len(a) > 1:
            if re.match(r"^-[^-]*[ef]$", a):
                script = True
                i += 1
            elif name == "sed" and a == "-i" and i + 1 < len(args) and args[i + 1] == "":
                i += 1
        elif not script:
            script = True
        else:
            files.append(a)
        i += 1
    return files


def shell_write_targets(cmd: str) -> list[str]:
    """Paths a shell command writes: redirect targets and file args of known write commands."""
    out: list[str] = []
    for argv, redirects in _simple_commands(cmd):
        out.extend(redirects)
        name, args = _command_word(argv)
        if name not in _WRITE_CMDS:
            continue
        plain = [a for a in args if not a.startswith("-")]
        if name == "tee":
            out.extend(plain)
        elif name in ("sed", "perl"):
            out.extend(_in_place_files(name, args))
        elif name == "dd":
            out.extend(a[3:] for a in args if a.startswith("of="))
        elif name == "truncate":
            out.extend(a for i, a in enumerate(args) if not a.startswith("-") and not (i > 0 and args[i - 1] in ("-s", "--size")))
        elif len(plain) >= 2:
            dest, srcs = plain[-1], plain[:-1]
            out.append(dest)
            out.extend(f"{dest.rstrip('/')}/{s.split('/')[-1]}" for s in srcs)
            if name == "mv":
                out.extend(srcs)
    return [p for p in out if p and not re.search(r"[$`*?{]", p)]


def interpreter_write_literals(cmd: str, interpreters: str, write_apis: str) -> list[str]:
    """Quoted path-like literals, when the command runs an interpreter and its code calls a write API."""
    if not any(re.search(interpreters, _command_word(argv)[0]) for argv, _ in _simple_commands(cmd)):
        return []
    if not re.search(write_apis, cmd):
        return []
    lits = re.findall(r"'([^'\s$`]+)'", cmd) + re.findall(r'"([^"\s$`]+)"', cmd)
    return [s for s in lits if re.search(r"[./]", s) and not re.fullmatch(r"\.+", s)]


def is_protected(path: str, cfg: dict, repo_root: Path) -> bool:
    try:
        target = (repo_root / path).resolve() if not Path(path).is_absolute() else Path(path).resolve()
        rel = str(target.relative_to(repo_root.resolve())).replace("\\", "/")
    except (ValueError, OSError):
        return False
    if rel in ("", "."):
        return False
    if check_path_deny(rel, cfg.get("path_deny") or []):
        return True
    return not in_boundary(rel, cfg.get("allowed_write_globs") or []) and target.is_file()


def check_shell_writes(cmd: str, cfg: dict, repo_root: Path) -> str | None:
    for p in shell_write_targets(cmd):
        if is_protected(p, cfg, repo_root):
            return f"shell write to protected path {p} (redirect/tee/sed -i/cp/mv…). Edit allowed files with the edit tool; leave this one alone."
    for p in interpreter_write_literals(cmd, cfg.get("shell_interpreters") or "^$", cfg.get("shell_write_apis") or "$^"):
        if is_protected(p, cfg, repo_root):
            return f"script writes files and names protected path {p}. Edit allowed files with the edit tool; leave this one alone."
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
        reason = check_shell_writes(str(blob), cfg, repo_root)
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
