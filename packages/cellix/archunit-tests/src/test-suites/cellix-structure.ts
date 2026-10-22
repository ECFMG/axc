import { checkCellixStructure } from '@cellix/lint';
import { describe, expect, it } from 'vitest';

interface CellixStructureTestsConfig {
	root: string;
}

export function describeCellixStructureTests(config: CellixStructureTestsConfig): void {
	describe('Cellix structure', () => {
		it('application layers match Cellix file roles, function shape, and cross-package names', async () => {
			const violations = await checkCellixStructure({ root: config.root });
			expect(violations).toStrictEqual([]);
		});
	});
}
