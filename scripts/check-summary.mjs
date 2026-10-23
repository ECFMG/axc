// Failure summary for the agent's check log (biome / tsc / vitest / knip / AC coverage): one line per problem,
// naming the file (repo-relative) and the rule or error id. Nothing recognised -> verify-excerpt, else the tail.
// Usage: <checks> >/tmp/check.log 2>&1 || node scripts/check-summary.mjs /tmp/check.log
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { acceptanceFailures } from './acceptance-failures.mjs';

const MAX = 40;
const WIDTH = 220;

/** Workspace package name -> repo-relative dir, from pnpm-workspace.yaml `dir/*` globs. */
function packageDirs(root) {
	const dirs = new Map();
	let yaml = '';
	try {
		yaml = readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8');
	} catch {
		return dirs;
	}
	for (const [, glob] of yaml.matchAll(/^\s*-\s*['"]?([\w./-]+)\/\*['"]?\s*$/gm)) {
		let names = [];
		try {
			names = readdirSync(path.join(root, glob));
		} catch {}
		for (const name of names) {
			const pkg = path.join(root, glob, name, 'package.json');
			if (!existsSync(pkg)) continue;
			try {
				dirs.set(JSON.parse(readFileSync(pkg, 'utf8')).name, `${glob}/${name}`);
			} catch {}
		}
	}
	return dirs;
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: strip ANSI escapes
const ANSI = /\u001b\[[0-9;?]*[A-Za-z]/g;
const TASK = /^(@?[\w./-]+?):[a-z][\w:-]*: ?/; // turbo `pkg:task: ` prefix

export function summarize(log, root = process.cwd()) {
	const dirs = packageDirs(root);
	const out = [];
	const lines = log.replace(ANSI, '').split(/\r?\n/);
	const rel = (pkg, file) => (pkg && dirs.has(pkg) && !file.startsWith('/') ? `${dirs.get(pkg)}/${file}` : file);
	for (let i = 0; i < lines.length; i++) {
		const pkg = lines[i].match(TASK)?.[1];
		const line = lines[i].replace(TASK, '');
		const next = (from, re) => {
			for (let j = from; j < Math.min(lines.length, from + 6); j++) {
				const m = lines[j].replace(TASK, '').match(re);
				if (m) return m[1].trim();
			}
			return '';
		};
		let m = line.match(/^(\S+?):(\d+):(\d+) ((?:lint|assist|parse|syntax)\/\S+|format)\b/) ?? line.match(/^(\S+?\.\w+) (format)\b/);
		if (m) {
			const [file, l, c, rule] = m[4] ? [m[1], m[2], m[3], m[4]] : [m[1], '', '', m[2]];
			const level = next(i + 1, /^\s*([×!])\s/);
			out.push(`biome${level === '!' ? ' (warn)' : ''}  ${rel(pkg, file)}${l ? `:${l}:${c}` : ''} ${rule} — ${next(i + 1, /^\s*[×!]\s+(.*)/)}`);
			continue;
		}
		m = line.match(/^(\S+?)\((\d+),(\d+)\): error (TS\d+): (.*)/) ?? line.match(/^(\S+?):(\d+):(\d+) - error (TS\d+): (.*)/);
		if (m) {
			out.push(`ts     ${rel(pkg, m[1])}:${m[2]}:${m[3]} ${m[4]} — ${m[5]}`);
			continue;
		}
		m = line.match(/^\s*FAIL\s+(\S+)\s*(?:>\s*(.*))?$/);
		if (m) {
			out.push(`test   ${rel(pkg, m[1])}${m[2] ? ` > ${m[2]}` : ''} — ${next(i + 1, /^\s*(\w*Error\b.*|Error:.*|expected .*)/) || 'failed'}`);
			continue;
		}
		m = line.match(/^((?:Unused|Unlisted|Unresolved|Duplicate) [\w ]+) \((\d+)\)$/);
		if (m) {
			const rows = lines.slice(i + 1, i + 1 + Math.min(Number(m[2]), 10)).map((r) =>
				r
					.replace(TASK, '')
					.trim()
					.replace(/\s{2,}/g, ' '),
			);
			out.push(...rows.map((r) => `knip   ${m[1]}: ${r}`));
			continue;
		}
		if (/^AC coverage failed/.test(line)) {
			for (let j = i + 1; j < lines.length && /^\s+\S/.test(lines[j]); j++) out.push(`ac     missing ${lines[j].trim()}`);
		}
	}
	out.push(...acceptanceFailures(log, root));
	return [...new Set(out)];
}

function excerpt(file) {
	try {
		execFileSync(process.execPath, [path.join(import.meta.dirname, 'verify-excerpt.mjs'), file], { encoding: 'utf8' });
		return '';
	} catch (error) {
		return String(error.stdout ?? '').trim();
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const file = process.argv[2] ?? '/tmp/check.log';
	const log = readFileSync(file, 'utf8');
	const found = summarize(log);
	const clip = (l) => (l.length > WIDTH && !l.startsWith('scenario  ') ? `${l.slice(0, WIDTH)}…` : l);
	if (found.length) {
		console.log(`check FAILED: ${found.length} problem(s) — full log: ${file}`);
		console.log(found.slice(0, MAX).map(clip).join('\n'));
		if (found.length > MAX) console.log(`… +${found.length - MAX} more (full log: ${file})`);
	} else console.log(excerpt(file) || log.trimEnd().split('\n').slice(-30).join('\n'));
}
