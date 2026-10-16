import { describe, expect, it } from 'vitest';
import { importedSpecifiers, isProductionSource } from './source-files.ts';

describe('source-files helpers', () => {
	it('extracts static and dynamic import specifiers', () => {
		const content = "import { a } from '@axc/domain';\nimport type { B } from \"./b.ts\";\nconst c = await import('mongoose');\nexport * from './d.ts';";
		expect(importedSpecifiers(content)).toEqual(['@axc/domain', './b.ts', 'mongoose', './d.ts']);
	});

	it('treats tests, declarations and archunit suites as non-production', () => {
		expect(isProductionSource('src/a.ts')).toBe(true);
		expect(isProductionSource('src/a.test.ts')).toBe(false);
		expect(isProductionSource('src/a.d.ts')).toBe(false);
		expect(isProductionSource('src/archunit-tests/a.ts')).toBe(false);
	});
});
