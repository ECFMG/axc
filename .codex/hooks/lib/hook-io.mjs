import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const ANSI_ESCAPE_PATTERN = /\u001b\[[0-9;]*[A-Za-z]/g;

export function readHookInput() {
	const raw = readFileSync(0, 'utf8');
	if (raw.trim() === '') {
		return {};
	}
	return JSON.parse(raw);
}

export function respond(output) {
	process.stdout.write(`${JSON.stringify(output)}\n`);
}

export function run(command, args, cwd) {
	return spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, FORCE_COLOR: '0' } });
}

export function findRepositoryRoot(cwd) {
	const result = run('git', ['rev-parse', '--show-toplevel'], cwd);
	if (result.status !== 0) {
		return undefined;
	}
	return result.stdout.trim();
}

export function stripAnsi(text) {
	return text.replace(ANSI_ESCAPE_PATTERN, '');
}
