import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CellixLintConfig } from './config.js';
import { importSpecifiers, isTestFile, listSource, listTypeScript, readText, relativePosix, report, toPosix } from './files.js';

const LAYER_SUFFIX: Record<keyof CellixLintConfig['layers'], string> = {
	domain: 'domain',
	applicationServices: 'application-services',
	persistence: 'persistence',
	models: 'data-sources-mongoose-models',
	serviceMongoose: 'service-mongoose',
	rest: 'rest',
	graphql: 'graphql',
};

export async function checkCellixVisibility(input: { root: string; lint: CellixLintConfig }): Promise<string[]> {
	const violations: string[] = [];
	const layers = input.lint.layers;
	const scope = input.lint.scope;
	const publicImport = new RegExp(`^${escapeRegExp(scope)}/(${Object.values(LAYER_SUFFIX).join('|')})$`);
	const scopedImport = new RegExp(`^${escapeRegExp(scope)}/`);

	const domainRoot = path.join(input.root, layers.domain);
	const applicationRoot = path.join(input.root, layers.applicationServices);
	const persistenceRoot = path.join(input.root, layers.persistence);
	const roots = [domainRoot, applicationRoot, persistenceRoot, path.join(input.root, layers.models), path.join(input.root, layers.serviceMongoose), path.join(input.root, layers.rest), path.join(input.root, layers.graphql)];

	for (const root of roots) {
		const files = root.endsWith(layers.graphql) ? await listSource(root, ['.ts']) : await listTypeScript(root);
		for (const file of files) {
			if (isTestFile(file)) continue;
			const content = await readText(file);
			for (const specifier of importSpecifiers(content)) {
				if (scopedImport.test(specifier) && !publicImport.test(specifier)) {
					violations.push(report(file, 'cellix/visibility-public-export', specifier, `${scope}/<package> with no deep path. Add a subpath only as a package export, and import that exact export`));
				}
			}
			violations.push(...checkContextIsolation(file, content, applicationRoot));
			violations.push(...checkPersistenceFolder(file, content, persistenceRoot));
		}
	}

	for (const layer of Object.keys(layers) as (keyof CellixLintConfig['layers'])[]) {
		violations.push(...(await checkPackageExports(input.root, layers[layer], LAYER_SUFFIX[layer])));
	}
	return violations;
}

function checkContextIsolation(file: string, content: string, applicationRoot: string): string[] {
	const relative = relativePosix(file, applicationRoot);
	const context = relative.match(/^contexts\/([^/]+)/)?.[1];
	if (!context) return [];
	const violations: string[] = [];
	for (const specifier of importSpecifiers(content)) {
		if (!specifier.startsWith('.')) continue;
		const resolved = toPosix(path.normalize(path.join(path.dirname(file), specifier)));
		const resolvedRelative = relativePosix(resolved, applicationRoot);
		const other = resolvedRelative.match(/^contexts\/([^/]+)/)?.[1];
		if (other && other !== context) {
			violations.push(report(file, 'cellix/visibility-context', specifier, `an import inside contexts/${context} or a package barrel. Contexts do not import each other`));
		}
	}
	return violations;
}

function checkPersistenceFolder(file: string, content: string, persistenceRoot: string): string[] {
	const relative = relativePosix(file, persistenceRoot);
	const folder = relative.match(/^(datasources\/domain\/[^/]+\/[^/]+)\//)?.[1];
	if (!folder) return [];
	const violations: string[] = [];
	for (const specifier of importSpecifiers(content)) {
		if (!specifier.startsWith('.')) continue;
		const resolved = toPosix(path.normalize(path.join(path.dirname(file), specifier)));
		const resolvedRelative = relativePosix(resolved, persistenceRoot);
		if (!resolvedRelative.startsWith(`${folder}/`)) {
			violations.push(report(file, 'cellix/visibility-persistence-folder', specifier, `a sibling file in ${folder}/ or a package barrel`));
		}
	}
	return violations;
}

async function checkPackageExports(root: string, layerPath: string, suffix: string): Promise<string[]> {
	const packageJson = path.join(root, layerPath.replace(/\/src$/, ''), 'package.json');
	let parsed: { name?: string; exports?: unknown };
	try {
		parsed = JSON.parse(await readFile(packageJson, 'utf8')) as { name?: string; exports?: unknown };
	} catch {
		return [];
	}
	if (!parsed.exports || typeof parsed.exports !== 'object') {
		return [report(packageJson, 'cellix/visibility-exports', 'missing exports map', `export only "." or explicit "${suffix}" subpaths pointing at dist`)];
	}
	const violations: string[] = [];
	for (const [key, value] of Object.entries(parsed.exports)) {
		if (key.includes('*')) {
			violations.push(report(packageJson, 'cellix/visibility-exports', key, 'an explicit subpath. Wildcard exports are closed'));
		}
		const targets = exportTargets(value);
		for (const target of targets) {
			if (target.includes('/src/') || target.endsWith('/src') || target.includes('*')) {
				violations.push(report(packageJson, 'cellix/visibility-exports', `${key} -> ${target}`, 'a dist file. Source paths are not public'));
			}
		}
	}
	return violations;
}

function exportTargets(value: unknown): string[] {
	if (typeof value === 'string') return [value];
	if (!value || typeof value !== 'object') return [];
	return Object.values(value).flatMap((entry) => exportTargets(entry));
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
