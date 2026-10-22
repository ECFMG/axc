// PreToolUse write-boundary guard (Grok Build; Claude/Copilot-shaped input also accepted). Dependency-free; fails open.
// Rules live in .github/hooks/write-boundary.json (shared with the Copilot guard). Deny rules match per line,
// so a newline can't hide a command; quoted heredoc bodies are inert text and are skipped.
// Shell writes (redirects, tee, sed -i, cp/mv, interpreter scripts) to protected paths are denied too.
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const HEREDOC_ANY = /<<-?\s*(?:'(\w+)'|"(\w+)"|\\?(\w+))/;
const WRITE_CMDS = new Set(['tee', 'cp', 'mv', 'install', 'ln', 'rsync', 'truncate', 'dd', 'sed', 'perl']);

/** Drops every heredoc body (quoted or not) so shell syntax is parsed without document text. */
function dropHeredocBodies(cmd) {
	const out = [];
	const lines = cmd.split('\n');
	for (let i = 0; i < lines.length; i++) {
		out.push(lines[i]);
		const m = HEREDOC_ANY.exec(lines[i]);
		if (!m) continue;
		const end = m[1] ?? m[2] ?? m[3];
		while (i + 1 < lines.length && lines[i + 1].trim() !== end) i++;
		i++;
	}
	return out.join('\n');
}

/** Minimal shell lexer: words (quotes removed) and operators; `n>`/`&>` are redirects, `>&n` is an fd dup. */
function lex(cmd) {
	const toks = [];
	let word = '';
	let inWord = false;
	const flush = () => {
		if (inWord) toks.push({ w: word });
		word = '';
		inWord = false;
	};
	for (let i = 0; i < cmd.length; i++) {
		const c = cmd[i];
		if (c === "'") {
			const j = cmd.indexOf("'", i + 1);
			word += cmd.slice(i + 1, j < 0 ? cmd.length : j);
			inWord = true;
			i = j < 0 ? cmd.length : j;
		} else if (c === '"') {
			let j = i + 1;
			for (; j < cmd.length && cmd[j] !== '"'; j++) {
				if (cmd[j] === '\\' && j + 1 < cmd.length) j++;
				word += cmd[j];
			}
			inWord = true;
			i = j;
		} else if (c === '\\' && i + 1 < cmd.length) {
			word += cmd[++i];
			inWord = true;
		} else if (c === '>' || (c === '&' && cmd[i + 1] === '>')) {
			if (/^\d+$/.test(word)) {
				word = '';
				inWord = false;
			}
			flush();
			if (c === '&') i++;
			while (cmd[i + 1] === '>' || cmd[i + 1] === '|') i++;
			if (cmd[i + 1] === '&') {
				i++;
				toks.push({ op: 'dup' });
			} else toks.push({ op: '>' });
		} else if (c === '<') {
			flush();
			while (cmd[i + 1] === '<' || cmd[i + 1] === '-') i++;
			toks.push({ op: '<' });
		} else if (';&|()\n`'.includes(c)) {
			flush();
			toks.push({ op: ';' });
		} else if (c === ' ' || c === '\t') flush();
		else {
			word += c;
			inWord = true;
		}
	}
	flush();
	return toks;
}

/** Splits lexed tokens into simple commands: { argv, redirects }. */
function simpleCommands(cmd) {
	const cmds = [];
	let cur = { argv: [], redirects: [] };
	const toks = lex(dropHeredocBodies(cmd));
	for (let i = 0; i < toks.length; i++) {
		const t = toks[i];
		if (t.op === ';') {
			cmds.push(cur);
			cur = { argv: [], redirects: [] };
		} else if (t.op === '>' && toks[i + 1]?.w !== undefined) cur.redirects.push(toks[++i].w);
		else if ((t.op === 'dup' || t.op === '<') && toks[i + 1]?.w !== undefined) i++;
		else if (t.w !== undefined) cur.argv.push(t.w);
	}
	cmds.push(cur);
	return cmds.filter((c) => c.argv.length || c.redirects.length);
}

const PREFIXES = new Set(['sudo', 'env', 'command', 'exec', 'nohup', 'time', 'xargs']);
const commandWord = (argv) => {
	let i = 0;
	while (i < argv.length && (PREFIXES.has(argv[i]) || /^\w+=/.test(argv[i]) || (i > 0 && argv[i].startsWith('-') && PREFIXES.has(argv[i - 1])))) i++;
	return [argv[i]?.split('/').pop() ?? '', argv.slice(i + 1)];
};

/** In-place editors: files are the non-option args after the script (`-e`/`-f` supply it instead). */
function inPlaceFiles(name, args) {
	if (!args.some((a) => (name === 'sed' ? /^-[^-]*i|^--in-place/ : /^-[^-]*i/).test(a))) return [];
	const files = [];
	let script = false;
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '--') continue;
		if (a.startsWith('-') && a.length > 1) {
			if (/^-[^-]*[ef]$/.test(a)) {
				script = true;
				i++;
			} else if (name === 'sed' && a === '-i' && args[i + 1] === '') i++;
			continue;
		}
		if (!script) script = true;
		else files.push(a);
	}
	return files;
}

/** Paths a shell command writes: redirect targets and file args of known write commands. */
export function shellWriteTargets(cmd) {
	const out = [];
	for (const { argv, redirects } of simpleCommands(cmd)) {
		out.push(...redirects);
		const [name, args] = commandWord(argv);
		if (!WRITE_CMDS.has(name)) continue;
		const plain = args.filter((a) => !a.startsWith('-'));
		if (name === 'tee') out.push(...plain);
		else if (name === 'sed' || name === 'perl') out.push(...inPlaceFiles(name, args));
		else if (name === 'dd') out.push(...args.filter((a) => a.startsWith('of=')).map((a) => a.slice(3)));
		else if (name === 'truncate') out.push(...args.filter((a, i) => !a.startsWith('-') && !/^(-s|--size)$/.test(args[i - 1] ?? '')));
		else if (plain.length >= 2) {
			const dest = plain.at(-1);
			const srcs = plain.slice(0, -1);
			out.push(dest, ...srcs.map((s) => `${dest.replace(/\/$/, '')}/${s.split('/').pop()}`));
			if (name === 'mv') out.push(...srcs);
		}
	}
	return out.filter((p) => p && !/[$`*?{]/.test(p));
}

/** Quoted path-like literals in interpreter code, when the command runs an interpreter and calls a write API. */
export function interpreterWriteLiterals(cmd, interpreters, writeApis) {
	const runsInterpreter = simpleCommands(cmd).some(({ argv }) => new RegExp(interpreters).test(commandWord(argv)[0]));
	if (!runsInterpreter || !new RegExp(writeApis).test(cmd)) return [];
	const lits = [...cmd.matchAll(/'([^'\s$`]+)'/g), ...cmd.matchAll(/"([^"\s$`]+)"/g)].map((m) => m[1]);
	return lits.filter((s) => /[./]/.test(s) && !/^\.+$/.test(s));
}

const WRITE_TOOLS = new Set(['search_replace', 'write', 'hashline_edit', 'edit', 'multiedit', 'create', 'create_file', 'write_file', 'apply_patch', 'strreplace', 'notebookedit', 'editnotebook', 'delete']);
const SHELL_TOOLS = new Set(['run_terminal_command', 'bash', 'shell', 'execute']);
const PATH_KEYS = ['file_path', 'filePath', 'path', 'target_file', 'target_notebook', 'notebook_path', 'file'];
const HEREDOC_QUOTED = /<<-?\s*(?:'(\w+)'|"(\w+)"|\\(\w+))/;

export const loadRules = (root) => JSON.parse(readFileSync(path.join(root, '.github/hooks/write-boundary.json'), 'utf8'));

/** Drops quoted heredoc bodies and indentation so line-anchored rules see each command. */
export function stripQuotedHeredocs(cmd) {
	const out = [];
	const lines = cmd.split('\n');
	for (let i = 0; i < lines.length; i++) {
		out.push(lines[i]);
		const m = HEREDOC_QUOTED.exec(lines[i]);
		if (!m) continue;
		const end = m[1] ?? m[2] ?? m[3];
		while (i + 1 < lines.length && lines[i + 1].trim() !== end) i++;
		i++;
	}
	return out.map((line) => line.trimStart()).join('\n');
}

const firstMatch = (rules, text, flags) => rules.find(([pattern]) => new RegExp(pattern, flags).test(text))?.[1];

const rel = (root, p) => path.relative(root, path.resolve(root, p)).split(path.sep).join('/');

/** Protected = matches path_deny, or an existing repo file outside allowed_write_globs. Paths outside the repo are not ours. */
function isProtected(p, rules, root) {
	const r = rel(root, p);
	if (!r || r.startsWith('../') || path.isAbsolute(r)) return false;
	if (firstMatch(rules.path_deny ?? [], r, 'i')) return true;
	try {
		return !inGlobs(r, rules.allowed_write_globs ?? []) && statSync(path.join(root, r)).isFile();
	} catch {
		return false;
	}
}

const inGlobs = (rel, globs) => globs.some((g) => (g.endsWith('/**') ? rel === g.slice(0, -3) || rel.startsWith(g.slice(0, -2)) : rel === g));

export function check(input, rules, root) {
	const tool = String(input.toolName ?? input.tool_name ?? '').toLowerCase();
	const args = input.toolInput ?? input.tool_input ?? {};
	if (SHELL_TOOLS.has(tool)) {
		const cmd = String(args.command ?? '');
		const reason = firstMatch(rules.bash_deny ?? [], stripQuotedHeredocs(cmd), 'im');
		if (reason) return `BLOCKED (write-boundary): ${reason}`;
		const target = shellWriteTargets(cmd).find((p) => isProtected(p, rules, root));
		if (target) return `BLOCKED (write-boundary): shell write to protected path ${rel(root, target)} (redirect/tee/sed -i/cp/mv…). Edit allowed files with the edit tool; leave this one alone.`;
		const lit = interpreterWriteLiterals(cmd, rules.shell_interpreters ?? '^$', rules.shell_write_apis ?? '$^').find((p) => isProtected(p, rules, root));
		return lit && `BLOCKED (write-boundary): script writes files and names protected path ${rel(root, lit)}. Edit allowed files with the edit tool; leave this one alone.`;
	}
	if (!WRITE_TOOLS.has(tool)) return undefined;
	for (const key of PATH_KEYS) {
		if (typeof args[key] !== 'string' || !args[key]) continue;
		const r = rel(root, args[key]);
		const denied = firstMatch(rules.path_deny ?? [], r, 'i');
		if (denied) return `BLOCKED (write-boundary): ${denied} Path: ${r}`;
		if ((rules.no_new_dirs ?? []).some((p) => r.startsWith(p)) && !existsSync(path.dirname(path.join(root, r))))
			return `BLOCKED (write-boundary): no new folders under packages/axc — add a flat file in an existing src/ folder. Path: ${r}`;
		if (!inGlobs(r, rules.allowed_write_globs ?? [])) return `BLOCKED (write-boundary): outside allowed write paths: ${r}. Writable: ${rules.allowed_write_globs.join(', ')}`;
	}
	return undefined;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	try {
		const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
		const root = input.workspaceRoot ?? process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
		const reason = check(input, loadRules(root), root);
		if (reason) process.stdout.write(JSON.stringify({ decision: 'deny', reason, hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }));
	} catch {
		// fail open
	}
}
