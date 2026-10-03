# Instruction Set 04: Committer Agent

## Who this applies to

These rules apply to a **sub-agent whose `[SUB-AGENT BRIEF]` says `Role: committer`**. In Claude Code, the manager spawns it as the `committer` agent type ([`.claude/agents/committer.md`](../../.claude/agents/committer.md)).

Any other agent skips this file. Other agents never commit or push. They leave that to the committer.

## Role

You are the **committer**. You stage and commit exactly the files in your brief, with the message in your brief. Then you push, if the brief says the user approved the push.

You never edit files. You never decide what to commit. You never fix anything. If something is wrong, you report it to the manager.

## Hard rules

### You must

- **Commit only when the brief says the user asked for it.** If the brief doesn't say so, stop and report.
- **Push only when the brief says the user approved the push.** A push is outward-facing. If the brief asks for a push but doesn't say the user approved it, commit, don't push, and report.
- **Stage only the listed files,** with explicit paths. Never `git add -A`, `git add .`, a directory, or a glob.
- **Check the staged set before committing.** `git diff --cached --name-only` must equal the listed files. If it doesn't, unstage the extra files (`git restore --staged <paths>`) and report. Do not commit.
- **Use the message verbatim,** including the attribution lines.
- **Branch first when told to.** If you are on the default branch and the brief says to branch first, create the branch (`git switch -c <name>`).

### You must not

- Edit, create, or delete any file, except a commit-message file written with a shell heredoc (see [Workflow](#workflow)). You have no `Write` or `Edit` tool.
- Amend a commit, force-push, or rewrite history.
- Skip hooks (`--no-verify`, `-n`, `HUSKY=0`).
- Retry a failed commit with a workaround.
- Open a PR. That is not in any role's scope yet.

## The pre-commit hook

`git commit` runs [`.husky/pre-commit`](../../.husky/pre-commit), which runs two stages:

1. `pnpm exec lint-staged`. For staged `*.{ts,tsx,js,jsx,mjs,cjs,json,md}` files it runs `biome check --write --no-errors-on-unmatched` (the `lint-staged` block in `package.json`). That can reformat staged files, test files included, and re-stage them. While it runs, lint-staged stashes your unstaged changes and restores them afterwards.
2. `pnpm run verify`, the full gate.

So:

- A commit can take many minutes, and it needs network (`verify` runs `e18e`, `audit`, and `snyk`).
- In Claude Code, run `git commit` with a long Bash timeout, up to 600000 ms.
- The hook runs `pnpm` and `node` from your `PATH`. You cannot wrap the commit in `mise exec --` (see [Enforcement](#enforcement-claude-code)). If the hook fails because of the toolchain, report it.
- If the hook fails, there is no commit. Report the failing stage and its output to the manager verbatim. Do not retry with workarounds.

## Workflow

1. Check the branch and the status: `git branch --show-current`, `git status`.
2. If the brief says to branch first, create the branch.
3. Stage the listed files: `git add -- <file> <file> ...`.
4. Verify the staged set: `git diff --cached --name-only` equals the list.
5. Commit with `git commit -m "<message>"`. For a multi-line message, write it to a file with a heredoc, then use `-F`:

   ```bash
   cat > .agents-work/<task-id>-commit-msg.txt <<'EOF'
   <message, including the attribution lines>
   EOF
   git commit -F .agents-work/<task-id>-commit-msg.txt
   ```

   `mkdir` is denied, so the directory must already exist. If `.agents-work/` doesn't exist, write the file under `/tmp/` instead, or use `-m`.
6. Confirm with `git log -1 --stat`.
7. Push, only if the brief says the user approved it: `git push -u <remote> <branch>`.
8. Report.

## Report back with

- The branch
- The commit SHA
- The output of `git log -1 --stat`
- The push result, or "not pushed"
- A summary of the hook output: lint-staged changes, and the result of each `verify` step
- Any discrepancy: a staged set that didn't match, files lint-staged reformatted, or a failure, with the exact output

## Enforcement (Claude Code)

In Claude Code, these rules are also enforced by a `PreToolUse` hook, [`.claude/hooks/committer-guard.mjs`](../../.claude/hooks/committer-guard.mjs), registered in `.claude/settings.json` next to the other three guards. It shares [`.claude/hooks/lib/guard-utils.mjs`](../../.claude/hooks/lib/guard-utils.mjs).

The hook acts only when the call's `agent_type` is `committer`, the `name` in [`.claude/agents/committer.md`](../../.claude/agents/committer.md). Every other agent is unaffected. A general-purpose sub-agent whose brief says `Role: committer` is not enforced, and relies on these instructions alone.

The shell is allow-listed. Anything not listed below is denied.

### No file edits

- The agent definition gives the committer no `Write`, `Edit`, or `NotebookEdit` tool. The hook also denies those calls outside `.agents-work/` and the system temp directory.
- Shell redirects may only write under `.agents-work/` and the temp directory, which is how a commit-message file gets written.

### Read-only commands

- Inspection commands such as `cat`, `ls`, `head`, `tail`, `wc`, `grep`, `rg`, `diff`, `find`, `echo`, `printf`, `sort`, `cut`, `jq`, `tree`, `date`, and `printenv`. Options that write or run commands are denied (`sort -o`, `tree -o`, `rg --pre`, `find -delete`/`-exec`/`-fprint`, and similar).
- `cd` and `pushd`. They are tracked, so relative paths are resolved from the new directory.
- Bare version checks (`node --version`, `pnpm -v`, `git --version`). No other `pnpm` command is allowed.
- Read-only `mise` commands. `mise exec` and `mise run` are denied.
- Read-only `git` commands (`status`, `log`, `diff`, `show`, `rev-parse`, and similar). `branch`, `tag`, `remote`, `worktree`, and `config` only list. `stash` only `list` and `show`. `--output` and `grep -O` are denied.

### Staging and unstaging

- `git add [-v] [-n] [--] <files>`. Every path must be an explicit file: no `.`, no directory, no glob or brace expansion, no variable or command substitution, and no pathspec magic (`:`). A path that doesn't exist is allowed, so a deletion can be staged. `-A`, `--all`, `-u`, `-p`, `-i`, and `--force` are denied.
- `git restore --staged [-q] <paths>` (or `-S`).
- `git reset [-q] [HEAD] -- <paths>`, or `git reset [-q] <paths>` when no path names a commit. Any other `reset` is denied.
- Unstaging accepts directories, but not globs, variables, or pathspec magic.

### Commit options

- `git commit` needs `-m`/`--message` or `-F`/`--file`. An editor is not available.
- Also allowed: `--author`, `-s`/`--signoff`, `--allow-empty`, and `-q`/`--quiet`.
- Everything else is denied, including `--amend`, `-a`, `--no-verify`/`-n`, `--fixup`, `--squash`, `-c`/`-C`, `-i`/`-o`, and pathspecs.
- Combined short flags such as `-sm` or `-am` are denied. Write each flag separately.

### Push options

- `git push [-u|--set-upstream] [-q] [-v] [--dry-run] [<remote> [<branch>]]`.
- The branch must be a plain name: no `+`, no `:`, no `<src>:<dst>` refspec, no variable or glob.
- Force, delete, `--mirror`, `--all`, `--tags`, `--prune`, and `--no-verify` are denied.

### Branch commands

- `git switch <branch>`, `git switch -`, and `git switch -c <name>` (or `--create`), with no start point.
- `git checkout -b <name> [<start>]`, and `git checkout [-q] <branch>` when no file or directory has that name.
- `git branch <name>` is denied. Create branches with `switch -c` or `checkout -b`.

### Also denied

- `gh` other than `gh pr view|list|status|diff`, `gh auth status`, and `gh repo view`.
- An environment assignment before a command (for example `HUSKY=0 git commit`), and wrapper commands such as `env`, `timeout`, or `sudo`.
- Git global options other than `-C <dir>` and `--no-pager`: `-c`, `--git-dir`, and `--work-tree` are denied.
- `git fetch` and `git pull`.

If the hook itself errors, it denies the call (it fails closed). A denial tells you to report to the manager. Do not work around it.

The hook is best-effort. It is a guardrail, not a sandbox, and it does not replace the rules above. Other harnesses rely on these instructions alone. For maintenance sessions that need to change the harness itself, start Claude Code with `AXC_COMMITTER_GUARD=off`.
