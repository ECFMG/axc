const HEAVY = [/(?:^|\s)pnpm(?:\s+run)?\s+verify(?:\s|$)/, /(?:^|\s)pnpm(?:\s+run)?\s+check(?:\s|$)/, /(?:^|\s)pnpm(?:\s+run)?\s+test(?::acceptance|:arch)?(?:\s|$)/];

export const CLOSED_TREES = ['node_modules', 'packages/cellix'];

export const HEAVY_MESSAGE = 'Run that command through pnpm run agent-check so its log stays out of the chat. Example: pnpm run agent-check -- pnpm run verify';

export const BROAD_MESSAGE = 'That glob covers a whole tree. Name a directory and a filename, for example packages/axc/rest/src/**/*.ts.';

export const WIDE_SHELL_MESSAGE = 'Read one file. A multi-file dump stays in the transcript for the rest of the run.';

export function isWrapped(text) {
	return text.includes('agent-check');
}

/** verify, check, and the full test scripts. Their logs are the cache. */
export function heavyCommandReason(text) {
	if (isWrapped(text)) return undefined;
	if (HEAVY.some((pattern) => pattern.test(text))) return HEAVY_MESSAGE;
	return undefined;
}

/** A glob with no filename. **\/*.ts stays allowed. */
export function broadGlobReason(pattern) {
	if (typeof pattern !== 'string' || pattern.length === 0) return undefined;
	const normalized = pattern.replaceAll('\\', '/');
	if (normalized === '*' || normalized === '**' || normalized === '**/*') return BROAD_MESSAGE;
	if (/(?:^|\/)\*\*\/\*$/.test(normalized) || /(?:^|\/)\*\*$/.test(normalized)) return BROAD_MESSAGE;
	return undefined;
}

export function wideShellReason(text) {
	const dumps = text.match(/\b(?:cat|head|tail)\b/g);
	if (dumps && dumps.length > 2) return WIDE_SHELL_MESSAGE;
	if (/\bfind\b/.test(text) && !text.includes('-name') && !text.includes('-path')) return WIDE_SHELL_MESSAGE;
	return undefined;
}

export function closedReferenceInText(value) {
	for (const tree of CLOSED_TREES) {
		const index = value.indexOf(tree);
		if (index === -1) continue;
		const before = value[index - 1];
		const after = value[index + tree.length];
		const startsAtBoundary = before === undefined || /[/\s"'`=:(]/.test(before);
		const endsAtBoundary = after === undefined || /[/\s"'`),;&|]/.test(after);
		if (!startsAtBoundary || !endsAtBoundary) continue;
		const suffix = value
			.slice(index)
			.split(/[\s"'`),;&|]/, 1)[0]
			.replace(/\/+$/, '');
		return suffix;
	}
	return undefined;
}

/** A closed path may be opened when the newest check log names that file. */
export function logAllowsPath(log, blockedReference) {
	const leaf = blockedReference.slice(blockedReference.lastIndexOf('/') + 1);
	if (!blockedReference.includes('/') || !leaf.includes('.')) return false;
	return log.includes(blockedReference);
}
