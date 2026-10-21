import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { verifyCacheDir } from './tree-fingerprint.mjs';

// Security findings already present when a harness session starts. `verify` compares audit and
// Snyk results against this snapshot so an agent is not pushed into fixing advisories its change
// did not introduce (those fixes live in root files outside the task boundary). CI never has a
// snapshot, so CI keeps the strict gate.

export function baselineFile(repoRoot) {
	return path.join(verifyCacheDir(repoRoot), 'security-baseline.json');
}

/** High/critical advisories from `pnpm audit`, keyed `GHSA@module`. */
export function auditFindings(repoRoot) {
	const result = spawnSync('pnpm', ['audit', '--audit-level=high', '--json'], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
	const report = JSON.parse(result.stdout || '{}');
	return [...new Set(Object.values(report.advisories ?? {}).map((advisory) => `${advisory.github_advisory_id ?? advisory.id}@${advisory.module_name}`))].sort();
}

/** Vulnerability IDs from a `snyk test --json-file-output` report (one project or an array of projects). */
export function snykFindings(jsonFile) {
	if (!existsSync(jsonFile)) {
		return undefined;
	}
	const report = JSON.parse(readFileSync(jsonFile, 'utf8'));
	const projects = Array.isArray(report) ? report : [report];
	return [...new Set(projects.flatMap((project) => (project.vulnerabilities ?? []).map((vulnerability) => `${vulnerability.id}@${vulnerability.packageName}`)))].sort();
}

export function snykAvailable() {
	return spawnSync('snyk', ['--version'], { encoding: 'utf8' }).status === 0;
}

export function recordBaseline(repoRoot, base) {
	const file = baselineFile(repoRoot);
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, JSON.stringify({ base, status: 'pending', startedAt: new Date().toISOString() }));
	const snapshot = { base, status: 'complete', recordedAt: new Date().toISOString(), audit: auditFindings(repoRoot), snyk: undefined };
	if (snykAvailable()) {
		const snykFile = path.join(path.dirname(file), 'snyk-baseline.json');
		rmSync(snykFile, { force: true });
		spawnSync('snyk', ['test', '--all-projects', '--policy-path=.snyk', `--json-file-output=${snykFile}`], { cwd: repoRoot, stdio: 'ignore' });
		snapshot.snyk = snykFindings(snykFile);
	}
	writeFileSync(file, JSON.stringify(snapshot, null, 2));
	return snapshot;
}

/** Waits for a pending snapshot started at session start; returns undefined when there is none. */
export async function readBaseline(repoRoot, waitMs = 120_000) {
	const file = baselineFile(repoRoot);
	const deadline = Date.now() + waitMs;
	while (existsSync(file)) {
		const snapshot = JSON.parse(readFileSync(file, 'utf8'));
		if (snapshot.status === 'complete') {
			return snapshot;
		}
		if (Date.now() > deadline) {
			return undefined;
		}
		await new Promise((resolve) => setTimeout(resolve, 2000));
	}
	return undefined;
}
