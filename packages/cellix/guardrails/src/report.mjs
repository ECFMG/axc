// The next turn sees this block. Expected is first, so the shape is not truncated away.

const DIAGNOSTIC = /Expected:|Found:|Found \d+ error|error TS\d+|Cellix lint|violation|Unused export|AssertionError|Formatter would have printed|\.[A-Za-z0-9]+:\d+:\d+|\(\d+,\d+\)|packages\/\S+\.(?:ts|tsx|mjs|js|json)/;
const SUMMARY = /^(?:Found \d+ errors?\.?|Checked \d+ files.*)$/;

/** At most one screen. Lines that state Expected come before the rest. */
export function errorBlock(lines) {
	const trimmed = lines.map((line) => line.trim()).filter((line) => line.length > 0);
	const diagnostic = [...new Set(trimmed.filter((line) => DIAGNOSTIC.test(line) && !SUMMARY.test(line) && !line.includes('node_modules')))];
	if (diagnostic.length > 0) {
		const expected = diagnostic.filter((line) => line.includes('Expected:') || line.includes('AssertionError') || line.includes('.feature:'));
		const rest = diagnostic.filter((line) => !expected.includes(line));
		return [...expected, ...rest].slice(0, 2);
	}
	const wrapper = trimmed.filter((line) => /\[ELIFECYCLE\]|\bFAIL\b|^\s*Failed:/.test(line));
	return [...new Set([...wrapper, ...trimmed.slice(-2)])].slice(-2);
}
