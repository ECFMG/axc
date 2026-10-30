// After verify passes, a diff lands when every path is on the session list.
import { spawnSync } from 'node:child_process';
import { sessionAllows } from '../packages/cellix/guardrails/src/session.mjs';

const SIDE_EFFECTS = new Set(['pnpm-lock.yaml']);

export function landDecision(paths, session) {
	if (!session) return { ok: false, reason: 'no-session', off: [], message: 'No session file. pnpm run agent-check -- pnpm run verify is still required.' };
	const off = paths.filter((file) => !onSession(file, session));
	if (off.length === 0) return { ok: true, reason: 'land', off: [], message: 'CELLIX_LAND=pass' };
	return { ok: false, reason: 'off-session', off, message: `These paths are not on the session list: ${off.join(', ')}. Revert them. Leave ocom-write.config.json unchanged.` };
}

export function changedPaths(cwd) {
	const result = spawnSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd, encoding: 'utf8' });
	if (result.status !== 0) return null;
	return pathsFromPorcelain(result.stdout);
}

export function pathsFromPorcelain(text) {
	const parts = text.split('\0').filter((part) => part.length > 0);
	const paths = [];
	for (let index = 0; index < parts.length; index += 1) {
		const entry = parts[index];
		if (entry.length < 4) continue;
		const status = entry.slice(0, 2);
		const path = entry.slice(3);
		if (status.includes('R') || status.includes('C')) {
			const next = parts[index + 1];
			if (next !== undefined) {
				paths.push(path, next);
				index += 1;
			}
			continue;
		}
		paths.push(path);
	}
	return paths;
}

function onSession(file, session) {
	if (file.startsWith('.cellix/')) return true;
	if (SIDE_EFFECTS.has(file)) return true;
	return sessionAllows(file, session);
}
