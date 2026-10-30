// The next turn sees this block. Expected is first, so the shape is not truncated away.

const DIAGNOSTIC = /Expected:|Found:|Found \d+ error|error TS\d+|\berror\b|Cellix lint|violation|Unused export|AssertionError|\.[A-Za-z0-9]+:\d+:\d+|\(\d+,\d+\)/;
const SUMMARY = /^(?:Found \d+ errors?\.?|Checked \d+ files.*)$/;

/** At most one screen. Lines that state Expected come before the rest. */
export function errorBlock(lines) {
	const trimmed = lines.map((line) => line.trim()).filter((line) => line.length > 0);
	const diagnostic = [...new Set(trimmed.filter((line) => DIAGNOSTIC.test(line) && !SUMMARY.test(line)))];
	if (diagnostic.length > 0) {
		const expected = diagnostic.filter((line) => line.includes('Expected:'));
		const rest = diagnostic.filter((line) => !line.includes('Expected:'));
		return [...expected, ...rest].slice(0, 24);
	}
	const wrapper = trimmed.filter((line) => /\[ELIFECYCLE\]|\bFAIL\b|^\s*Failed:/.test(line));
	return [...new Set([...wrapper, ...trimmed.slice(-12)])].slice(-24);
}
