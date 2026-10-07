import { checkCellixBiomeConfig } from './biome-layers.js';
import { type CellixLintConfig, defaultCellixLintConfig } from './config.js';
import { checkCellixContent } from './content.js';
import { checkCellixGraph } from './graph.js';
import { checkCellixStructure } from './structure.js';
import { checkCellixVisibility } from './visibility.js';

interface CellixLintInput {
	root: string;
	lint?: CellixLintConfig;
}

export async function checkCellixLint(input: CellixLintInput): Promise<string[]> {
	const lint = input.lint ?? defaultCellixLintConfig();
	const structure = await checkCellixStructure({ root: input.root, lint });
	const content = await checkCellixContent({ root: input.root, lint });
	const visibility = await checkCellixVisibility({ root: input.root, lint });
	const graph = await checkCellixGraph({ root: input.root, lint });
	const biome = await checkCellixBiomeConfig({ root: input.root });
	return [...structure, ...content, ...visibility, ...graph, ...biome];
}

export function checkCellixStructureSuite(input: CellixLintInput): Promise<string[]> {
	return checkCellixLint(input);
}
