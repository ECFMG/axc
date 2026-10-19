import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Hash of the working tree (tracked + untracked, minus gitignored files), so a verify
// result can be tied to the exact code state it ran against.
export function treeFingerprint(cwd) {
	const dir = mkdtempSync(path.join(tmpdir(), 'axc-tree-'));
	const env = { ...process.env, GIT_INDEX_FILE: path.join(dir, 'index') };
	try {
		execFileSync('git', ['add', '-A'], { cwd, env, stdio: 'ignore' });
		return execFileSync('git', ['write-tree'], { cwd, env, encoding: 'utf8' }).trim();
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

export function verifyCacheDir(repoRoot) {
	return path.join(repoRoot, 'node_modules', '.cache', 'axc-verify');
}
