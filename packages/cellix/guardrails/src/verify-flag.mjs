import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export function workingTree(cwd) {
	const head = git(cwd, ['rev-parse', 'HEAD']);
	if (!head) throw new Error('The verify flag needs a git HEAD.');
	const porcelain = git(cwd, ['status', '--porcelain', '--untracked-files=all'])
		.split('\n')
		.filter((line) => line.length > 0 && !line.includes('.cellix/'))
		.join('\n');
	return { head, tree: createHash('sha256').update(porcelain).digest('hex') };
}

export function writeFlag(cwd) {
	const snapshot = workingTree(cwd);
	const directory = path.join(cwd, '.cellix');
	mkdirSync(directory, { recursive: true });
	const body = { flag: 'pass', exitCode: 0, endedAt: new Date().toISOString(), head: snapshot.head, tree: snapshot.tree };
	writeFileSync(path.join(directory, 'verify.json'), `${JSON.stringify(body)}\n`);
	return body;
}

export function checkFlag(cwd) {
	let stamp = null;
	try {
		stamp = JSON.parse(readFileSync(path.join(cwd, '.cellix', 'verify.json'), 'utf8'));
	} catch {
		return false;
	}
	if (stamp?.flag !== 'pass' || stamp.exitCode !== 0 || !stamp.head || !stamp.tree) return false;
	try {
		const snapshot = workingTree(cwd);
		return stamp.head === snapshot.head && stamp.tree === snapshot.tree;
	} catch {
		return false;
	}
}

function git(cwd, args) {
	const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
	return result.status === 0 ? result.stdout.trim() : '';
}
