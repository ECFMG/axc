// Codex PreToolUse hook: refuses tool calls that would change the harness or
// dependency set, bypass the commit hook, or leave planning notes in the repo.
// Applies the same rules whether the write happens through apply_patch or
// through the shell (heredocs, tee, sed -i ...).
import { basename } from 'node:path';
import { findRepositoryRoot, readHookInput, respond } from './lib/hook-io.mjs';
import { commandWords, extractCommandText, isApplyPatch, splitCommands, toRepositoryPath, writeTargets } from './lib/tool-command.mjs';

const PROTECTED_PATH_RULES = [
	{ pattern: /^pnpm-lock\.yaml$/, reason: 'pnpm-lock.yaml is generated; run `pnpm install` instead of editing it' },
	{ pattern: /^pnpm-workspace\.yaml$/, reason: 'the dependency catalog is owned by the harness; use existing catalog entries' },
	{ pattern: /^(?:\.codex|\.agents|\.husky)\//, reason: 'hooks, rules, skills and agents are harness files, not task output' },
	{ pattern: /^AGENTS\.md$/, reason: 'AGENTS.md is harness configuration' },
	{ pattern: /^(?:biome\.json|knip\.json|\.snyk)$|(?:^|\/)turbo\.json$/, reason: 'tool configuration (including every turbo.json) is fixed for the task; fix the code, not the gate' },
	{ pattern: /^scripts\/check-script-policy\.mjs$/, reason: 'the dependency script policy is a gate, not task output' },
	{ pattern: /^packages\/cellix\//, reason: 'packages/cellix is vendored framework code; extend it from the axc packages instead' },
];

const PLANNING_FILE_PATTERN = /(?:^|[-_.])(?:plan|plans|planning|notes?|todo|scratch|checklist|requirements?[-_]?map|progress|summary)(?:[-_.]|$)/i;
const NEW_MARKDOWN_PATTERN = /\.(?:md|mdx|txt)$/i;

const COMMAND_RULES = [
	{ test: (words) => words[0] === 'pnpm' && ['add', 'remove', 'rm', 'update', 'up', 'upgrade', 'link', 'patch'].includes(words[1]), reason: 'dependencies are fixed for the task; use what pnpm-workspace.yaml already provides' },
	{
		test: (words) => words[0] === 'pnpm' && ['install', 'i'].includes(words[1]) && words.slice(2).some((word) => !word.startsWith('-')),
		reason: 'dependencies are fixed for the task; `pnpm install` without package names is fine',
	},
	{
		test: (words) => ['npm', 'yarn', 'bun'].includes(words[0]) && ['add', 'install', 'i'].includes(words[1]) && words.slice(2).some((word) => !word.startsWith('-')),
		reason: 'this workspace uses pnpm with a fixed dependency set',
	},
	{
		test: (words) => words[0] === 'git' && words.includes('commit') && words.some((word) => word === '--no-verify' || /^-[a-zA-Z]*n[a-zA-Z]*$/.test(word)),
		reason: 'git commit must run the pre-commit verification; fix the failing check instead',
	},
	{
		test: (words) => words[0] === 'git' && ['push', 'reset', 'checkout', 'switch', 'rebase', 'merge'].includes(words[1]) && !(words[1] === 'checkout' && words.includes('--')),
		reason: 'stay on the task branch; only the harness operator moves branches or pushes',
	},
	{ test: (words) => words[0] === 'git' && words[1] === 'commit' && words.some((word) => word === '--amend'), reason: 'do not amend commits' },
];

function pathViolations(toolInput, cwd, root) {
	const violations = [];
	for (const target of writeTargets(toolInput)) {
		const repositoryPath = toRepositoryPath(target, cwd, root);
		if (repositoryPath === undefined) {
			continue;
		}
		for (const rule of PROTECTED_PATH_RULES) {
			if (rule.pattern.test(repositoryPath)) {
				violations.push(`${repositoryPath}: ${rule.reason}`);
			}
		}
		if (NEW_MARKDOWN_PATTERN.test(repositoryPath) && PLANNING_FILE_PATTERN.test(basename(repositoryPath)) && !repositoryPath.startsWith('docs/')) {
			violations.push(`${repositoryPath}: keep plans and notes out of the repository (reason in your final summary instead)`);
		}
	}
	return violations;
}

function commandViolations(commandText) {
	if (commandText === '' || isApplyPatch(commandText)) {
		return [];
	}
	const violations = [];
	for (const segment of splitCommands(commandText)) {
		const words = commandWords(segment);
		if (words.length === 0) {
			continue;
		}
		for (const rule of COMMAND_RULES) {
			if (rule.test(words)) {
				violations.push(`\`${segment}\`: ${rule.reason}`);
				break;
			}
		}
	}
	return violations;
}

export function evaluate(input, root) {
	const cwd = input.cwd ?? process.cwd();
	const toolInput = input.tool_input ?? {};
	const violations = [...commandViolations(extractCommandText(toolInput)), ...pathViolations(toolInput, cwd, root)];
	return [...new Set(violations)];
}

function main() {
	const input = readHookInput();
	const root = findRepositoryRoot(input.cwd ?? process.cwd());
	if (root === undefined) {
		return;
	}
	const violations = evaluate(input, root);
	if (violations.length === 0) {
		return;
	}
	respond({
		hookSpecificOutput: {
			hookEventName: 'PreToolUse',
			permissionDecision: 'deny',
			permissionDecisionReason: `Blocked by repository policy:\n- ${violations.join('\n- ')}`,
		},
	});
}

if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
	main();
}
