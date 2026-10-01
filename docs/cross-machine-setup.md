# Cross-machine AXC setup

- [ ] Use Node 24 via nvm (the repo’s `.node-version`; Node 20 breaks pnpm 11).
- [ ] Use pnpm 11+ and JRE 17+.
- [ ] Optionally install/authenticate Snyk CLI; `pnpm run verify` may skip Snyk when the CLI or auth is unavailable.
- [ ] Install/use `portless` for local service URLs.
- [ ] Keep sibling clones/worktrees under one `src/` directory, for example `axc`, `axc-mog-xai-1`, and `axc-mog-xai-1-a-out`.
- [ ] Run `pnpm install --frozen-lockfile`.
- [ ] Run `pnpm run verify` (Snyk may be skipped without the CLI/auth).
- [ ] Point the tool at `AGENTS.md` and require the mandatory `run-validation` skill only on the default SCORE path.
- [ ] Treat Copilot agents/hooks as optional; the portable core does not require Copilot.
- [ ] Use `docs/eval-contract.md` for SCORE gates and `docs/harness-cost-usage.md` for cost fields.
- [ ] Optionally install RTK (Rust Token Killer) for bash-output token savings (not a repo dependency):
  ```bash
  brew install rtk-ai/tap/rtk
  rtk --version
  rtk gain
  ```
  Optional `rtk init` is an operator step only — prefer not committing tool-specific hooks that break portable Grok/Cursor paths. Skip paid Headroom.app; open-source Headroom CLI is optional external (`uv tool install --python 3.13 "headroom-ai[all]"`).
