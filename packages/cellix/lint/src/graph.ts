import path from 'node:path';
import type { CellixLintConfig } from './config.js';
import { importSpecifiers, isTestFile, listSource, listTypeScript, readText, report, toPosix } from './files.js';

type LayerName = keyof CellixLintConfig['layers'];

const PACKAGE_SUFFIX: Record<LayerName, string> = {
	domain: 'domain',
	applicationServices: 'application-services',
	persistence: 'persistence',
	models: 'data-sources-mongoose-models',
	serviceMongoose: 'service-mongoose',
	rest: 'rest',
	graphql: 'graphql',
};

const FORBIDDEN: Record<LayerName, LayerName[]> = {
	domain: ['applicationServices', 'persistence', 'models', 'serviceMongoose', 'rest', 'graphql'],
	applicationServices: ['models', 'serviceMongoose', 'rest', 'graphql'],
	persistence: ['applicationServices', 'rest', 'graphql'],
	models: ['domain', 'persistence', 'applicationServices', 'rest', 'graphql'],
	serviceMongoose: ['domain', 'applicationServices', 'rest', 'graphql'],
	rest: ['persistence', 'models', 'serviceMongoose'],
	graphql: ['persistence', 'models', 'serviceMongoose'],
};

export async function checkCellixGraph(input: { root: string; lint: CellixLintConfig }): Promise<string[]> {
	const files = await collect(input.root, input.lint);
	const layerOf = new Map<string, LayerName>();
	for (const file of files) {
		const layer = layerFor(file.file, input.root, input.lint);
		if (layer) layerOf.set(file.file, layer);
	}

	const violations: string[] = [];
	const edges = new Map<string, Set<string>>();
	for (const file of files) {
		if (isTestFile(file.file)) continue;
		const sourceLayer = layerOf.get(file.file);
		if (!sourceLayer) continue;
		const content = await readText(file.file);
		for (const specifier of importSpecifiers(content)) {
			const targetLayer = layerFromSpecifier(specifier, input.lint.scope) ?? layerOf.get(resolveRelative(file.file, specifier, layerOf) ?? '');
			if (targetLayer && FORBIDDEN[sourceLayer].includes(targetLayer)) {
				violations.push(report(file.file, 'cellix/graph-layer', specifier, `${sourceLayer} does not depend on ${targetLayer}`));
			}
			const resolved = resolveRelative(file.file, specifier, layerOf);
			if (!resolved) continue;
			const list = edges.get(file.file) ?? new Set<string>();
			list.add(resolved);
			edges.set(file.file, list);
		}
	}

	for (const cycle of findCycles(edges)) {
		violations.push(report(cycle[0] ?? '', 'cellix/graph-cycle', cycle.map((file) => toPosix(file)).join(' -> '), 'an acyclic import graph'));
	}
	return violations;
}

async function collect(root: string, lint: CellixLintConfig): Promise<{ file: string }[]> {
	const layers = lint.layers;
	const groups = await Promise.all([
		listTypeScript(path.join(root, layers.domain)),
		listTypeScript(path.join(root, layers.applicationServices)),
		listTypeScript(path.join(root, layers.persistence)),
		listTypeScript(path.join(root, layers.models)),
		listTypeScript(path.join(root, layers.serviceMongoose)),
		listTypeScript(path.join(root, layers.rest)),
		listSource(path.join(root, layers.graphql), ['.ts']),
	]);
	return groups.flat().map((file) => ({ file }));
}

function layerFor(file: string, root: string, lint: CellixLintConfig): LayerName | undefined {
	const posix = toPosix(file);
	for (const name of Object.keys(lint.layers) as LayerName[]) {
		const layerRoot = toPosix(path.join(root, lint.layers[name]));
		if (posix.startsWith(`${layerRoot}/`) || posix === layerRoot) return name;
	}
	return undefined;
}

function layerFromSpecifier(specifier: string, scope: string): LayerName | undefined {
	for (const name of Object.keys(PACKAGE_SUFFIX) as LayerName[]) {
		if (specifier === `${scope}/${PACKAGE_SUFFIX[name]}` || specifier.startsWith(`${scope}/${PACKAGE_SUFFIX[name]}/`)) return name;
	}
	return undefined;
}

function resolveRelative(file: string, specifier: string, known: Map<string, LayerName>): string | undefined {
	if (!specifier.startsWith('.')) return undefined;
	const base = path.normalize(path.join(path.dirname(file), specifier));
	const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')];
	for (const candidate of candidates) {
		if (known.has(candidate)) return candidate;
	}
	return undefined;
}

function findCycles(edges: Map<string, Set<string>>): string[][] {
	const color = new Map<string, 'visiting' | 'visited'>();
	const stack: string[] = [];
	const cycles: string[][] = [];
	const nodes = new Set<string>(edges.keys());
	for (const targets of edges.values()) {
		for (const target of targets) nodes.add(target);
	}

	const visit = (node: string): void => {
		color.set(node, 'visiting');
		stack.push(node);
		for (const next of edges.get(node) ?? []) {
			const state = color.get(next);
			if (state === 'visiting') {
				const start = stack.indexOf(next);
				cycles.push([...stack.slice(start), next]);
				continue;
			}
			if (!state) visit(next);
		}
		stack.pop();
		color.set(node, 'visited');
	};

	for (const node of nodes) {
		if (!color.has(node)) visit(node);
	}
	return cycles;
}
