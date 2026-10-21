import { existsSync } from 'node:fs';
import path from 'node:path';
import { block, boundaryHint, isCreatedThisRun, readHookInput, repoRoot, toRepoPath, writeViolation } from './lib/harness.mjs';

// PreToolUse (Bash): blocks commands that bypass the toolchain or the quality gates, and
// shell writes into files outside the write boundary. Best-effort; the Stop hook re-checks
// the full diff against the boundary.

const input = await readHookInput();
const command = input.tool_input?.command ?? '';

// Heredoc bodies are data, not commands.
function withoutHeredocBodies(text) {
	return text.replace(/<<-?\s*(['"]?)(\w+)\1([^\n]*)\n[\s\S]*?\n\s*\2[ \t]*(?=\n|$)/g, '<< $2$3');
}

// Shell words and operators. Quotes are removed from words; operators keep their redirect fd.
function tokenize(text) {
	const tokens = [];
	let word = '';
	let inWord = false;
	let quoted = false;
	let quote;
	const flush = () => {
		if (inWord) {
			tokens.push({ word, quoted });
		}
		word = '';
		inWord = false;
		quoted = false;
	};
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (quote) {
			if (ch === quote) {
				quote = undefined;
			} else if (ch === '\\' && quote === '"' && i + 1 < text.length) {
				word += text[++i];
			} else {
				word += ch;
			}
		} else if (ch === "'" || ch === '"') {
			quote = ch;
			inWord = true;
			quoted = true;
		} else if (ch === '\\' && i + 1 < text.length) {
			word += text[++i];
			inWord = true;
		} else if (ch === '\n') {
			flush();
			tokens.push({ op: ';' });
		} else if (/\s/.test(ch)) {
			flush();
		} else if ('|&;<>()'.includes(ch)) {
			const fd = ch === '>' && /^\d$/.test(word) ? word : '';
			if (fd) {
				word = '';
				inWord = false;
			}
			flush();
			let op = ch;
			while (i + 1 < text.length && '|&<>'.includes(text[i + 1])) {
				op += text[++i];
			}
			tokens.push({ op: fd + op });
		} else {
			word += ch;
			inWord = true;
		}
	}
	flush();
	return tokens;
}

const tokens = tokenize(withoutHeredocBodies(command));
// Command text with quoted strings removed, for keyword rules (a commit message saying "npm" is fine).
const skeleton = tokens.map((token) => token.op ?? (token.quoted ? '_' : token.word)).join(' ');

const rules = [
	{ pattern: /(^|[\s;&|()])(npm|npx|yarn)(\s|$)/, reason: 'This repo uses pnpm only. Use `pnpm`, `pnpm exec`, or `pnpm dlx`.' },
	{ pattern: /--no-verify\b|\bHUSKY=0\b/, reason: 'Skipping git hooks bypasses the quality gate. Fix the failure instead.' },
	{ pattern: /\bgit\s+push\b.*(\s-f\b|--force)/, reason: 'Force pushes are not allowed.' },
	{ pattern: /\bpnpm\b.*\s(-w|--workspace-root)\b/, reason: 'The root package.json is outside the write boundary. Add dependencies to the specific workspace package with `pnpm --filter <pkg> add`.' },
	{ pattern: /ignore-scripts|approve-builds|dangerouslyAllowAllBuilds/, reason: 'Dependency lifecycle scripts must stay disabled (.npmrc ignore-scripts=true).' },
	{
		pattern: /\bpnpm\s+audit\b.*\s--fix\b/,
		reason: '`pnpm audit --fix` rewrites the overrides in pnpm-workspace.yaml (a root file). Advisories present at session start are reported by `pnpm run verify` as pre-existing; list them under Known limitations.',
	},
	{ pattern: /\bsnyk\s+(ignore|wizard|protect|policy)\b/, reason: 'This writes .snyk (a root file). Snyk findings present at session start are reported by `pnpm run verify` as pre-existing; list them under Known limitations.' },
	{ pattern: /\bpnpm\s+(update|up|upgrade)\b/, reason: 'Upgrading dependencies rewrites lockfile entries and overrides beyond the task. Add what the task needs with `pnpm --filter <pkg> add <dep>`.' },
	{ pattern: /\b(mise|asdf)\s+(use|set|local|global|settings|config|trust|link)\b|\bnvm\s+alias\b/, reason: 'Toolchain version files are outside the write boundary. The repo pins Node in .nvmrc.' },
];

for (const { pattern, reason } of rules) {
	if (pattern.test(skeleton)) {
		block(`Blocked: ${reason}`);
	}
}

// Inline interpreter scripts that write files skip the Edit/Write boundary check and Biome.
if (/\b(node|python3?|ruby|deno|bun)\b[^;&|]*\s(-e|-c|-p|--eval|--print)\b/.test(command) && /writeFile|appendFile|createWriteStream|rmSync|unlinkSync|renameSync|copyFileSync|cpSync|\bopen\([^)]*['"][wax]\+?['"]/.test(command)) {
	block('Blocked: inline scripts that write files bypass the write-boundary check and the Biome formatter. Use the Edit/Write tools for file changes.');
}

// Shell writes: redirection targets and the paths mutating commands write to, resolved against
// any preceding `cd`.
const writesAll = /^(rm|rmdir|touch|mkdir|truncate|tee)$/;
const writesLast = /^(cp|mv|ln|install|rsync)$/;
const segments = [[]];
for (const token of tokens) {
	if (token.op && /^(;|&&|\|\||\||&|\(|\))$/.test(token.op)) {
		segments.push([]);
	} else {
		segments.at(-1)?.push(token);
	}
}

let cwd = input.cwd ?? repoRoot;
const targets = [];
const unresolvable = (word) => /[$`*?]|^~/.test(word);
for (const segment of segments) {
	const words = [];
	for (let i = 0; i < segment.length; i++) {
		const token = segment[i];
		if (token.op && /^\d?>>?\|?$|^&>>?$/.test(token.op)) {
			const next = segment[i + 1];
			if (next?.word !== undefined) {
				targets.push({ word: next.word, cwd });
				i++;
			}
		} else if (token.op === '<' || token.op === '<<' || token.op?.endsWith('>&')) {
			i++;
		} else if (token.word !== undefined) {
			words.push(token.word);
		}
	}
	const [name = '', ...args] = words;
	const paths = args.filter((word) => !word.startsWith('-'));
	if (name === 'cd') {
		if (paths[0] && !unresolvable(paths[0])) {
			cwd = path.resolve(cwd, paths[0]);
		}
	} else if (writesAll.test(name)) {
		targets.push(...paths.map((word) => ({ word, cwd, removes: name === 'rm' })));
	} else if (writesLast.test(name) && paths.length > 1) {
		targets.push({ word: paths.at(-1), cwd });
	} else if (/^(sed|perl)$/.test(name) && args.some((word) => /^-i/.test(word))) {
		// In-place editors: only existing files are targets (skips the script expression).
		targets.push(...paths.filter((word) => existsSync(path.resolve(cwd, word))).map((word) => ({ word, cwd })));
	}
}

for (const target of targets) {
	if (unresolvable(target.word) || target.word.startsWith('/dev/') || /(^|\/)(dist|node_modules|target|reports|coverage|\.turbo)(\/|$)/.test(target.word)) {
		continue;
	}
	const relPath = toRepoPath(target.word, target.cwd);
	// Deleting an untracked file the run created outside the boundary restores the baseline (the Stop hook asks for exactly that).
	if (target.removes && relPath !== undefined && isCreatedThisRun(relPath)) {
		continue;
	}
	const violation = writeViolation(relPath);
	if (violation) {
		block(`Blocked: this command writes to a protected path. ${violation} ${boundaryHint}`);
	}
}
