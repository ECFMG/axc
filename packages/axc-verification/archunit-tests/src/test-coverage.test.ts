import { describe, expect, it } from 'vitest';
import { readSourceFiles } from './support/workspace.ts';

// Task Set B asks for tests in specific areas. Each area must have an acceptance scenario over HTTP
// (tagged with the criterion it proves) and a unit test naming the same criterion.

const areas = [
	{ area: 'course search regression', criterion: 'B-AC1' },
	{ area: 'creation', criterion: 'B-AC2' },
	{ area: 'missing course', criterion: 'B-AC3' },
	{ area: 'inactive course', criterion: 'B-AC4' },
	{ area: 'input validation', criterion: 'B-AC5' },
	{ area: 'duplicate prevention', criterion: 'B-AC6' },
	{ area: 'retrieval', criterion: 'B-AC7' },
	{ area: 'filtering', criterion: 'B-AC8' },
	{ area: 'status transitions', criterion: 'B-AC9' },
	{ area: 'invalid transitions', criterion: 'B-AC10' },
	{ area: 'rejection reason', criterion: 'B-AC11' },
	{ area: 'audit trail', criterion: 'B-AC12' },
] as const;

const features = readSourceFiles('packages/axc-verification/acceptance-api/src/features', ['.feature']);
const unitTests = readSourceFiles('packages/axc').filter((file) => file.path.endsWith('.test.ts'));

const taggedScenarios = (criterion: string) => features.flatMap((file) => [...file.content.matchAll(new RegExp(`@${criterion}\\b[^\\n]*\\n\\s*Scenario`, 'g'))]).length;
const unitTestsNaming = (criterion: string) => unitTests.filter((file) => new RegExp(`\\b${criterion}\\b`).test(file.content)).map((file) => file.path);

describe('Task Set B test coverage', () => {
	it.each(areas)('B-AC14 $area ($criterion) has a tagged acceptance scenario and a unit test', ({ criterion }) => {
		expect(taggedScenarios(criterion)).toBeGreaterThan(0);
		expect(unitTestsNaming(criterion).length).toBeGreaterThan(0);
	});
});
