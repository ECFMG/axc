// A shell command is treated as a write when SHELL_WRITE matches.
// A node version directory on PATH is not a write. The hook skips tokens that contain versions/node.

const redirectOrInPlaceEdit = [String.raw`--write\b`, String.raw`>(?!&|\s*\/dev\/null)`, String.raw`\bsed\s+-i`, String.raw`\bperl\s+-i`];
const fileCommands = [String.raw`\btee\b`, String.raw`\brm\b`, String.raw`\bmv\b`, String.raw`\bcp\b`, String.raw`\bmkdir\b`, String.raw`\btouch\b`, String.raw`\bchmod\b`];
const gitCommandsThatChangeFiles = String.raw`\bgit\s+(?:restore|checkout|reset|clean|apply|stash|rebase|merge|pull|switch|revert)\b`;
const interpreterAtStartOfCommand = String.raw`(?:^|&&|\|\||[;&|]\s)\s*(?:\.?\/)?(?:[\w@.+-]+\/)*`;
const interpreters = [
	`${interpreterAtStartOfCommand}node(?:\\s|$)`,
	`${interpreterAtStartOfCommand}python3?(?:\\s|$)`,
	`${interpreterAtStartOfCommand}tsx(?:\\s|$)`,
	String.raw`\bpnpm exec node\b`,
	String.raw`\bpnpm exec tsx\b`,
	String.raw`\bpnpm exec python3?\b`,
];

export const WRITE_COMMAND = new RegExp([...redirectOrInPlaceEdit, ...fileCommands, gitCommandsThatChangeFiles, ...interpreters].join('|'));

const FILE_IN_REPO_ROOT = /^(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|\.snyk|AGENTS\.md|biome\.json|ocom-write\.config\.json|cellix-lint\.config\.json)$/;

/** Paths named in a write command. A command with none is denied, because the hook cannot check agentAccess. */
export function commandPaths(command) {
	const paths = [];
	for (const raw of command.split(/[\s'"`;|&<>]+/)) {
		const token = raw.includes('=') ? raw.slice(raw.indexOf('=') + 1) : raw;
		if (!token || token === '/dev/null' || token.includes('$') || token.includes('versions/node') || token.split(':').length > 2) continue;
		if (looksLikeFilePath(token)) paths.push(token);
	}
	return paths;
}

function looksLikeFilePath(token) {
	if (token.startsWith('./') || token.startsWith('/') || token.startsWith('packages/') || token.startsWith('apps/') || token.startsWith('.cursor/') || token.startsWith('.agents/')) return true;
	return FILE_IN_REPO_ROOT.test(token);
}
