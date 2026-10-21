# Known verify failures

Read this only when `pnpm run verify` fails at `pnpm audit` or Snyk.

`verify` runs steps in order and stops at the first failure. Its last two steps, `pnpm audit` and Snyk, can fail on third-party findings already present on main. A finding is pre-existing when its exact `package@version` appears in `git show main:pnpm-lock.yaml`; check each finding that way once. If audit fails only on pre-existing findings, run `pnpm run snyk` once to finish the check. Done means every step before audit passes and every audit and Snyk finding is pre-existing: list them as pre-existing and stop. Do not upgrade packages, edit `.snyk` or audit config, or rerun verify to clear them. If verify prints Snyk: SKIPPED, treat that as done too and report it.
