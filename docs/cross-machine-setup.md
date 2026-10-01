# Cross-machine AXC setup

- [ ] Use Node 24 via nvm (the repo’s `.node-version`; Node 20 breaks pnpm 11).
- [ ] Use pnpm 11+ and JRE 17+.
- [ ] Optionally install/authenticate Snyk CLI; `pnpm run verify` may skip Snyk when the CLI or auth is unavailable.
- [ ] Install/use `portless` for local service URLs.
- [ ] Keep sibling clones/worktrees under one `src/` directory, for example `axc`, `axc-mog-xai-1`, and `axc-mog-xai-1-a-out`.
- [ ] Run `pnpm install --frozen-lockfile`.
- [ ] Run `pnpm run verify` (Snyk may be skipped without the CLI/auth).
- [ ] Point the tool at `AGENTS.md` and require the mandatory `run-validation` skill.
- [ ] Treat Copilot agents/hooks as optional; the portable core does not require Copilot.
- [ ] Use `docs/eval-contract.md` for SCORE gates.
