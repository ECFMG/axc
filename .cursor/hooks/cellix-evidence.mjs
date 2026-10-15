#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (invokedDirectly()) main();

function main() {
	let input = {};
	try {
		input = JSON.parse(readFileSync(0, 'utf8') || '{}');
	} catch {
		const session = loadSession(process.cwd());
		if (session) finish({ followup_message: verifyFollowup(session) });
		finish({});
	}

	const root = typeof input.cwd === 'string' && input.cwd ? input.cwd : process.cwd();
	const event = String(input.hook_event_name ?? input.hookEventName ?? '');
	if (event === 'afterShellExecution') finish({});

	const session = loadSession(root);
	if (!session) finish({});
	const problem = review(root, session);
	if (problem) finish({ followup_message: problem });
	clearTaskSession(root);
	finish({});
}

function clearTaskSession(root) {
	rmSync(path.join(root, '.cellix/session.json'), { force: true });
	rmSync(path.join(root, '.cellix/verify.json'), { force: true });
}

function invokedDirectly() {
	const entry = process.argv[1];
	if (!entry) return false;
	return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

function verifyFollowup(session) {
	return `Run pnpm run verify for ${session.context}/${session.entity}/${session.action}. The turn stays open until it exits 0.`;
}

function review(root, session) {
	const task = `${session.context}/${session.entity}/${session.action}`;
	const feature = `packages/axc-verification/acceptance-api/src/features/${session.entity}-${session.action}.feature`;
	if (!session.files.includes(feature) || !exists(path.join(root, feature))) {
		return `${task} has no acceptance scenario. Run pnpm --filter @cellix/generator generate for this action.`;
	}
	const outside = pathsOutsideSession(changedPaths(root), session);
	if (outside.length > 0) {
		return `${outside[0]} is outside the ${task} new structure. Keep this diff on the generator file list. The session ends when pnpm run verify exits 0.`;
	}
	const stamp = loadStamp(root);
	if (!stamp) return verifyFollowup(session);
	const endedAt = Date.parse(stamp.endedAt);
	if (!Number.isFinite(endedAt) || endedAt < Date.parse(session.startedAt) || endedAt < newestEdit(root, session.files)) {
		return `Run pnpm run verify again for ${task}. A file changed after the last successful verify.`;
	}
	return '';
}

function changedPaths(root) {
	const result = spawnSync('git', ['status', '--porcelain', '-uall'], { cwd: root, encoding: 'utf8' });
	if (result.status !== 0 || !result.stdout) return [];
	return porcelainPaths(result.stdout);
}

export function porcelainPaths(stdout) {
	const paths = [];
	for (const line of stdout.split('\n')) {
		if (line.length < 4) continue;
		let file = line.slice(3).trim();
		const arrow = file.lastIndexOf(' -> ');
		if (arrow !== -1) file = file.slice(arrow + 4).trim();
		if (file.startsWith('"') && file.endsWith('"')) file = file.slice(1, -1);
		if (file.length > 0) paths.push(file);
	}
	return paths;
}

export function pathsOutsideSession(changed, session) {
	const allowed = new Set([...(session.files ?? []), ...(session.baseline ?? []), '.cellix/session.json', '.cellix/verify.json']);
	return changed.filter((file) => !allowed.has(file));
}

function newestEdit(root, files) {
	let newest = 0;
	for (const file of files) {
		try {
			newest = Math.max(newest, statSync(path.join(root, file)).mtimeMs);
		} catch {
			/* A listed file can be absent until the agent fills it. */
		}
	}
	return newest;
}

function loadSession(root) {
	try {
		const parsed = JSON.parse(readFileSync(path.join(root, '.cellix/session.json'), 'utf8'));
		if (!parsed || !Array.isArray(parsed.files) || !Array.isArray(parsed.baseline)) return null;
		return parsed;
	} catch {
		return null;
	}
}

function loadStamp(root) {
	try {
		return JSON.parse(readFileSync(path.join(root, '.cellix/verify.json'), 'utf8'));
	} catch {
		return null;
	}
}

function exists(file) {
	try {
		statSync(file);
		return true;
	} catch {
		return false;
	}
}

function finish(payload) {
	process.stdout.write(`${JSON.stringify(payload)}\n`);
	process.exit(0);
}
