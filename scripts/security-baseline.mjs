import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordBaseline } from './lib/security-baseline.mjs';

// Records the audit/Snyk findings of the current checkout. Started in the background by the
// SessionStart hook; `verify` reads the result to tell pre-existing findings from new ones.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
const snapshot = recordBaseline(repoRoot, base);
console.log(`security baseline for ${base.slice(0, 7)}: ${snapshot.audit.length} audit, ${snapshot.snyk?.length ?? 'no'} snyk findings`);
