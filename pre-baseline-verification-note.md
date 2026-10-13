# Pre-baseline verification note

This note records setup problems found before the Task A prompt. It is separate from `evaluation-run-record.md`. The Task A record measures the unsteered Grok 4.7 high-fast run.

## Azure Functions Core Tools

The first `pnpm test` and `pnpm run verify` attempts failed in the healthcheck acceptance test. The Serenity report showed:

```text
agentCourses-api exited unexpectedly (code: 1)
Error: spawn func ENOENT
```

Azure Functions Core Tools 4.16.0 was installed locally at `/opt/homebrew/bin/func`. The healthcheck then passed.

## Dependency audit and Snyk

With Core Tools installed, `pnpm run verify` reached `pnpm audit --audit-level=high` and failed on existing transitive dependencies from Docusaurus, Knip, and Vitest:

| Package | Finding | Resolution |
| --- | --- | --- |
| `tinypool@1.1.1` | Two critical advisories, `GHSA-5gmw-xhrv-c9v3` and `GHSA-85c8-ppgw-ccpr` | pnpm override to `2.1.2` |
| `source-map-js@1.2.1` | High advisory `GHSA-68fv-2mgg-jv7q` | pnpm override to `1.2.2` |
| `postcss-selector-parser@6.1.4` | High Snyk finding `SNYK-JS-POSTCSSSELECTORPARSER-20510276` | pnpm override to `7.1.6` |
| `http-cache-semantics@4.2.0` | High advisory `GHSA-ch52-4w7c-c8xp` | No patched release was published. Temporarily ignored through 2026-10-28. |
| `braces@3.0.3` | High advisory `GHSA-vfj7-8cjw-p6xm` | No patched release was published. Temporarily ignored through 2026-10-28. |
| `uri-js@4.4.1` | Medium Snyk finding `SNYK-JS-URIJS-20341609` | Latest published version is still `4.4.1`. Temporarily ignored in `.snyk` through 2026-10-28. |
| `hono@4.13.10` | Medium Snyk finding `SNYK-JS-HONO-20883336` | Fixed in `4.13.11`. The existing pnpm override now selects `4.13.13`. |

Snyk was authenticated as `ethan-h-nguyen`. The scan reported that organization even though the verify script requests `agentcourses`. After the overrides and the `uri-js` ignore, Snyk reported 0 open issues.

`pnpm run verify` then exited 0, including the docs build and the healthcheck. These fixes were applied before the Task A prompt so the baseline gate could run. They are not part of the Task A implementation.
