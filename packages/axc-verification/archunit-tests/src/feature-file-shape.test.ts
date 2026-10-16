import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { listFiles } from './support/source-files.ts';

// Feature files are the executable specification. This keeps them honest:
// every scenario states a precondition, an action and an observable outcome,
// and a feature does not hide several behaviours behind one scenario title.
const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = [path.resolve(packageDir, '../../axc'), path.resolve(packageDir, '../acceptance-api')];

interface Scenario {
	title: string;
	steps: string[];
}

function parseScenarios(content: string): Scenario[] {
	const scenarios: Scenario[] = [];
	let current: Scenario | undefined;
	for (const rawLine of content.split('\n')) {
		const line = rawLine.trim();
		const header = /^(?:Scenario|Scenario Outline|Example):\s*(.*)$/.exec(line);
		if (header) {
			current = { title: (header[1] ?? '').trim(), steps: [] };
			scenarios.push(current);
			continue;
		}
		if (/^Background:/.test(line)) {
			current = undefined;
			continue;
		}
		if (current && /^(Given|When|Then|And|But|\*)\b/.test(line)) {
			current.steps.push(line);
		}
	}
	return scenarios;
}

const keyword = (step: string): string => step.split(/\s+/)[0] ?? '';

function expandedKeywords(steps: string[]): string[] {
	let last = '';
	return steps.map((step) => {
		const word = keyword(step);
		if (word === 'And' || word === 'But' || word === '*') {
			return last;
		}
		last = word;
		return word;
	});
}

describe('feature file shape', () => {
	it('every feature file has at least one scenario with Given/When/Then and unique titles', async () => {
		const features = (await Promise.all(roots.map((root) => listFiles(root, (filePath) => filePath.endsWith('.feature'))))).flat();
		const violations: string[] = [];
		for (const feature of features) {
			const name = path.relative(path.resolve(packageDir, '../..'), feature.path);
			const scenarios = parseScenarios(feature.content);
			if (scenarios.length === 0) {
				violations.push(`${name}: no scenarios`);
				continue;
			}
			const titles = new Set<string>();
			for (const scenario of scenarios) {
				if (scenario.title === '') {
					violations.push(`${name}: scenario without a title`);
				}
				if (titles.has(scenario.title)) {
					violations.push(`${name}: duplicate scenario "${scenario.title}"`);
				}
				titles.add(scenario.title);
				const keywords = expandedKeywords(scenario.steps);
				if (!keywords.includes('When') || !keywords.includes('Then')) {
					violations.push(`${name}: "${scenario.title}" needs at least a When and a Then`);
				}
				const whenCount = keywords.filter((word) => word === 'When').length;
				if (whenCount > 1) {
					violations.push(`${name}: "${scenario.title}" performs ${whenCount} actions; split it into one scenario per behaviour`);
				}
			}
		}
		expect(violations).toEqual([]);
	});
});
