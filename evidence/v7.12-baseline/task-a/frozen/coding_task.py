"""Small, stdlib-only runner for fixed coding tasks. Commands are trusted input.

This audits the final Git diff; it is not an OS sandbox or a model provider.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import signal
import subprocess
import time


def digest(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    Path(path).write_text(json.dumps(value, indent=2) + "\n")


def git(repo, *args):
    return subprocess.check_output(["git", "-C", str(repo), *args]).decode()


def begin(repo, task_path, out):
    repo, task_path, out = map(lambda p: Path(p).resolve(), (repo, task_path, out))
    if git(repo, "status", "--porcelain"):
        raise ValueError("Start from a clean checkout; preserve existing work first.")
    if out == repo or repo in out.parents:
        raise ValueError("Evidence must be outside the target checkout.")
    task = json.loads(task_path.read_text())
    if task.get("prompt_file"):
        prompt_path = (task_path.parent / task["prompt_file"]).resolve()
        task["prompt"] = prompt_path.read_bytes().decode("utf-8")
    for field in ("id", "prompt", "spec", "allowed_paths", "checks", "settings"):
        if not task.get(field):
            raise ValueError("Missing task field: " + field)
    for prefix in task["allowed_paths"]:
        if Path(prefix).is_absolute() or ".." in Path(prefix).parts or not prefix.endswith("/"):
            raise ValueError("Allowed paths must be relative directory prefixes ending in /.")
    spec = (repo / task["spec"]).resolve()
    if repo not in spec.parents:
        raise ValueError("Specification must be within the repository.")
    out.mkdir(parents=True, exist_ok=False)
    frozen = json.dumps(task, sort_keys=True).encode()
    (out / "task.json").write_bytes(frozen)
    (out / "spec.md").write_bytes(spec.read_bytes())
    prompt_bytes = task["prompt"].encode("utf-8")
    (out / "prompt.md").write_bytes(prompt_bytes)
    verification = []
    for filename in task.get("verification_files", []):
        source = (task_path.parent / filename).resolve()
        if source.name in [entry["name"] for entry in verification]:
            raise ValueError("Duplicate verification filename")
        target = out / "verification" / source.name
        target.parent.mkdir(exist_ok=True)
        target.write_bytes(source.read_bytes())
        verification.append({"name": source.name, "sha256": digest(source.read_bytes())})
    state = {
        "schema_version": 1, "repo": str(repo), "started_at": time.time(),
        "base_commit": git(repo, "rev-parse", "HEAD").strip(),
        "branch": git(repo, "branch", "--show-current").strip(),
        "task_sha256": digest(frozen), "spec_sha256": digest(spec.read_bytes()),
        "prompt_sha256": digest(prompt_bytes), "verification": verification,
        "runner_sha256": digest(Path(__file__).read_bytes()),
        "source_hashes": {p.name: digest(p.read_bytes()) for p in Path(__file__).parent.iterdir() if p.suffix in (".py", ".mjs")},
        "existing_axc_directories": sorted(p.name for p in (repo / "packages/axc").glob("*") if p.is_dir()),
    }
    write_json(out / "state.json", state)
    return state


def load(out):
    out = Path(out)
    state = json.loads((out / "state.json").read_text())
    raw = (out / "task.json").read_bytes()
    if digest(raw) != state["task_sha256"] or digest((out / "spec.md").read_bytes()) != state["spec_sha256"]:
        raise ValueError("Frozen task or specification changed.")
    if digest(Path(__file__).read_bytes()) != state["runner_sha256"]:
        raise ValueError("Runner changed after freezing; start a fresh run.")
    for name, expected in state.get("source_hashes", {}).items():
        if digest((Path(__file__).parent / name).read_bytes()) != expected:
            raise ValueError("Executable source changed after freezing: " + name)
    task = json.loads(raw)
    prompt_bytes = (out / "prompt.md").read_bytes()
    if prompt_bytes != task["prompt"].encode("utf-8") or digest(prompt_bytes) != state.get("prompt_sha256"):
        raise ValueError("Frozen prompt changed.")
    for entry in state.get("verification", []):
        if digest((out / "verification" / entry["name"]).read_bytes()) != entry["sha256"]:
            raise ValueError("Frozen independent verification changed.")
    return state, task


def command(argv, repo, log, timeout, env=None):
    if not isinstance(argv, list) or not argv or not all(isinstance(x, str) for x in argv):
        raise ValueError("Commands must be nonempty arrays of strings (no shell).")
    started = time.monotonic()
    with Path(log).open("w") as stream:
        try:
            process = subprocess.Popen(argv, cwd=repo, stdout=stream, stderr=subprocess.STDOUT,
                                       env=env, start_new_session=True)
        except OSError as error:
            stream.write(str(error) + "\n")
            return {"argv": argv, "exit_code": 127, "timeout": False, "seconds": time.monotonic() - started}
        timed_out = False
        try:
            code = process.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            timed_out = True
            os.killpg(process.pid, signal.SIGKILL)
            code = process.wait()
    return {"argv": argv, "exit_code": code, "timeout": timed_out, "seconds": time.monotonic() - started}


def scope(repo, base, task, state):
    # --no-renames ensures both the removed and added paths are checked.
    changed = set(git(repo, "diff", "--no-renames", "--name-only", "-z", base).split("\0"))
    changed.update(git(repo, "ls-files", "--others", "--exclude-standard", "-z").split("\0"))
    changed.discard("")
    violations = []
    for name in sorted(changed):
        parts = Path(name).parts
        path = Path(repo) / name
        forbidden = not any(name.startswith(p) for p in task["allowed_paths"])
        forbidden |= any(part.startswith(".env") or part in ("local.settings.json", "host.json") for part in parts)
        forbidden |= any(name == p or name.startswith(p.rstrip("/") + "/") for p in task.get("protected_paths", []))
        if parts[:2] == ("packages", "axc") and len(parts) > 3:
            forbidden |= parts[2] not in state["existing_axc_directories"]
        # Reject symlink paths and symlink ancestors, including links targeting the checkout.
        forbidden |= any(p.is_symlink() for p in (path, *path.parents) if p != Path(repo).parent)
        if forbidden:
            violations.append(name)
    return {"changed_paths": sorted(changed), "violations": violations, "passed": not violations}


def usage(path):
    if path is None:
        return {"status": "unavailable", "total_tokens": None, "estimated_cost_usd": None,
                "reason": "No complete provider ledger supplied; shell output is not model usage."}
    data = json.loads(Path(path).read_text())
    if data.get("complete") is not True or not data.get("calls"):
        raise ValueError("Usage requires a complete ledger, including repair/retry/evaluation calls.")
    totals = {"input_tokens": 0, "output_tokens": 0, "cached_tokens": 0}
    sources = set()
    for call in data["calls"]:
        if call.get("source") not in ("provider", "estimate") or not call.get("model"):
            raise ValueError("Each usage call needs a model and provider/estimate source.")
        sources.add(call["source"])
        for key in totals:
            number = call.get(key)
            if key == "cached_tokens" and number is None:
                totals[key] = None
                continue
            if type(number) is not int or number < 0:
                raise ValueError("Token counters must be nonnegative integers; unknown is not zero.")
            if totals[key] is not None:
                totals[key] += number
        if call["cached_tokens"] is not None and call["cached_tokens"] > call["input_tokens"]:
            raise ValueError("Cached tokens must be a subset of input tokens.")
    costs = [c.get("estimated_cost_usd") for c in data["calls"]]
    for cost in costs:
        if cost is not None and (type(cost) not in (int, float) or not math.isfinite(cost) or cost < 0):
            raise ValueError("Costs must be finite nonnegative numbers or null.")
    return {"status": "estimated" if "estimate" in sources else "provider_reported", **totals,
            "model_calls": len(data["calls"]), "total_tokens": totals["input_tokens"] + totals["output_tokens"],
            "estimated_cost_usd": sum(costs) if all(c is not None for c in costs) else None,
            "calls": data["calls"]}


def execute(out):
    state, task = load(out)
    out = Path(out).resolve()
    if (out / "agent.json").exists():
        raise ValueError("Agent already executed; use a fresh run for a repeat.")
    if not task.get("agent_command"):
        raise ValueError("No agent_command configured. Use external execution followed by check.")
    if git(state["repo"], "rev-parse", "HEAD").strip() != state["base_commit"] or git(state["repo"], "status", "--porcelain"):
        raise ValueError("Command execution must start from the frozen clean base commit.")
    env = dict(os.environ, HARNESS_PROMPT_FILE=str(out / "prompt.md"),
               HARNESS_SPEC_FILE=str(out / "spec.md"), HARNESS_RUN_DIR=str(out))
    argv = [part.replace("{harness_dir}", str(Path(__file__).resolve().parent)) for part in task["agent_command"]]
    result = command(argv, state["repo"], out / "agent.log", task.get("agent_timeout", 1800), env)
    load(out)
    write_json(out / "agent.json", result)
    return result


def check(out, usage_path=None):
    state, task = load(out)
    out = Path(out)
    repo = Path(state["repo"])
    attempt = len(list(out.glob("validation-*"))) + 1
    logs = out / ("validation-%03d" % attempt)
    logs.mkdir()
    results = []
    before = scope(repo, state["base_commit"], task, state)
    spec_ok = digest((repo / task["spec"]).read_bytes()) == state["spec_sha256"]
    # Do not execute validation scripts in a checkout already violating the scope contract.
    if before["passed"] and spec_ok:
        for i, argv in enumerate(task["checks"]):
            argv = [part.replace("{verification_dir}", str((out / "verification").resolve())).replace("{base_commit}", state["base_commit"]).replace("{validation_dir}", str(logs.resolve())) for part in argv]
            result = command(argv, repo, logs / (str(i) + ".log"), task.get("check_timeout", 600))
            result["log"] = str(logs.name + "/" + str(i) + ".log")
            results.append(result)
    after = scope(repo, state["base_commit"], task, state)
    load(out)
    spec_ok &= digest((repo / task["spec"]).read_bytes()) == state["spec_sha256"]
    agent_path = out / "agent.json"
    agent = json.loads(agent_path.read_text()) if agent_path.exists() else None
    ledger = usage(usage_path)
    result = {
        "task_id": task["id"], "base_commit": state["base_commit"],
        "head_commit": git(repo, "rev-parse", "HEAD").strip(), "branch": git(repo, "branch", "--show-current").strip(),
        "task_sha256": state["task_sha256"], "spec_sha256": state["spec_sha256"], "prompt_sha256": state["prompt_sha256"],
        "settings": task["settings"], "spec_unchanged": bool(spec_ok), "scope": after,
        "executor": "command_adapter" if agent else "external_recorded", "agent": agent,
        "checks": results, "usage": ledger, "elapsed_seconds": time.time() - state["started_at"],
        "passed": bool(spec_ok and before["passed"] and after["passed"] and results
                       and all(r["exit_code"] == 0 for r in results) and (agent is None or agent["exit_code"] == 0)),
    }
    (logs / "changes.patch").write_text(git(repo, "diff", "--binary", state["base_commit"]))
    # Git diff omits untracked files; save their exact regular-file contents separately.
    for name in after["changed_paths"]:
        source = repo / name
        if source.is_file() and not source.is_symlink() and name not in after["violations"]:
            dest = logs / "files" / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(source.read_bytes())
    write_json(logs / "result.json", result)
    write_json(out / "result.json", result)
    lines = ["# Coding task validation", "", "Task: " + task["id"],
             "", "Result: " + ("PASS" if result["passed"] else "NOT PASSED"),
             "", "Base: `" + state["base_commit"] + "`", "", "Branch: `" + result["branch"] + "`",
             "", "Scope: " + ("pass" if after["passed"] else "FAIL"),
             "", "| Command | Exit | Seconds |", "| --- | ---: | ---: |"]
    lines += ["| `" + " ".join(r["argv"]) + "` | " + str(r["exit_code"]) + " | %.2f |" % r["seconds"] for r in results]
    lines += ["", "Usage: " + ledger["status"] + ". Total tokens: " + str(ledger["total_tokens"]) + ".",
              "", "Checks establish only their covered behavior. Scope auditing cannot prevent temporary writes, external calls or semantic changes to authentication. Review the patch."]
    (out / "report.md").write_text("\n".join(lines) + "\n")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="action", required=True)
    start = sub.add_parser("begin")
    start.add_argument("--repo", required=True)
    start.add_argument("--task", required=True)
    start.add_argument("--out", required=True)
    run = sub.add_parser("execute")
    run.add_argument("out")
    validate = sub.add_parser("check")
    validate.add_argument("out")
    validate.add_argument("--usage")
    args = parser.parse_args()
    try:
        if args.action == "begin":
            result = begin(args.repo, args.task, args.out)
        elif args.action == "execute":
            result = execute(args.out)
        else:
            result = check(args.out, args.usage)
        print(json.dumps(result, indent=2))
        return 0 if result.get("passed", result.get("exit_code", 0) == 0) else 1
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        parser.exit(2, str(error) + "\n")


if __name__ == "__main__":
    raise SystemExit(main())
