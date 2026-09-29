"""Shared helpers for hooks. Import-safe, dependency-free, fail-open."""
import json
import os
import subprocess
import sys

def read_event():
    """Parse the hook payload from stdin. Returns {} if anything is off."""
    try:
        raw = sys.stdin.read()
        return json.loads(raw) if raw.strip() else {}
    except Exception:
        return {}

def project_dir(event=None):
    return (
        os.environ.get("CLAUDE_PROJECT_DIR")
        or (event or {}).get("cwd")
        or os.getcwd()
    )

def state_dir(sub=""):
    """Where hooks keep machine-local state. Global by default so running
    these hooks user-wide never writes into someone's repo; a repo that
    installs the kit locally still gets its own via load_config override."""
    d = os.path.join(os.path.expanduser("~"), ".claude", "metrics", sub)
    os.makedirs(d, exist_ok=True)
    return d


def load_config(name, default):
    """Load <name> from the project's .claude/hooks/ first, then from beside
    this file. Project wins, so a repo can override the global defaults;
    default if neither is readable."""
    here = os.path.dirname(os.path.abspath(__file__))
    for path in (
        os.path.join(project_dir(), ".claude", "hooks", name),
        os.path.join(here, name),
    ):
        try:
            with open(path) as fh:
                return json.load(fh)
        except Exception:
            continue
    return default

def emit(payload):
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()

def deny(event_name, reason):
    """Block the tool call and tell the model why."""
    emit({
        "hookSpecificOutput": {
            "hookEventName": event_name,
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    })
    sys.exit(0)

def ask(event_name, reason):
    emit({
        "hookSpecificOutput": {
            "hookEventName": event_name,
            "permissionDecision": "ask",
            "permissionDecisionReason": reason,
        }
    })
    sys.exit(0)

def allow():
    """Say nothing; normal permission flow continues."""
    sys.exit(0)

def run(cmd, cwd=None, timeout=90):
    """Run a command, never raise. Returns (rc, combined_output)."""
    try:
        p = subprocess.run(
            cmd, shell=isinstance(cmd, str), cwd=cwd, timeout=timeout,
            capture_output=True, text=True,
        )
        return p.returncode, (p.stdout or "") + (p.stderr or "")
    except subprocess.TimeoutExpired:
        return 124, "timeout"
    except Exception as exc:
        return 1, str(exc)


def vault_write(sub, name, content, append=False):
    """Write (or append to) one note in the Obsidian vault, under
    <folder>/<sub>/<name>.md. Fail-open: logging must never break a session.
    Returns the note path, or None if the vault is off or unreachable."""
    try:
        cfg = load_config("vault.config.json", None)
        if not cfg or not cfg.get("enabled") or not os.path.isdir(cfg.get("vault_path", "")):
            return None
        d = os.path.join(cfg["vault_path"], cfg.get("folder", "Claude"), sub)
        os.makedirs(d, exist_ok=True)
        safe = "".join(c for c in name if c not in '\\/:*?"<>|').strip()
        path = os.path.join(d, f"{safe}.md")
        with open(path, "a" if append else "w") as fh:
            fh.write(content)
        return path
    except Exception:
        return None


def vault_log(category, text):
    """Append one timestamped, #claude/<category>-tagged bullet to today's
    daily note in the vault."""
    import time
    day = time.strftime("%Y-%m-%d")
    name = f"Claude Log — {day}"
    line = f"- **{time.strftime('%H:%M')}** #claude/{category} {text}\n"
    # First write of the day gets frontmatter + heading.
    try:
        cfg = load_config("vault.config.json", None)
        if cfg and cfg.get("enabled"):
            p = os.path.join(cfg.get("vault_path", ""), cfg.get("folder", "Claude"),
                             "Daily", f"{name}.md")
            if not os.path.exists(p):
                line = (f"---\ntags: [claude/log]\ndate: {day}\n---\n\n"
                        f"# {name}\n\n") + line
    except Exception:
        pass
    vault_write("Daily", name, line, append=True)
