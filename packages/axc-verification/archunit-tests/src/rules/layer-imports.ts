import { codeOf, isTestFile, type SourceFile } from '../support/workspace.ts';

// Import boundaries per layer, checked on module specifiers. Package imports in a pnpm
// workspace resolve to dist/ through node_modules, which archunit's file graph does not
// follow, so these rules read the specifiers directly.

interface LayerBoundary {
	layer: string;
	sourceDir: string;
	packageJson: string;
	/** When set, every bare import must be one of these packages (relative and node: imports are always allowed). */
	allowedPackages?: readonly string[];
	/** Packages this layer must not import. A trailing slash matches a whole scope. */
	forbiddenPackages?: readonly string[];
	guidance: string;
}

export const layerBoundaries: readonly LayerBoundary[] = [
	{
		layer: 'domain',
		sourceDir: 'packages/axc/domain/src',
		packageJson: 'packages/axc/domain/package.json',
		allowedPackages: ['@cellix/domain-seedwork'],
		guidance: 'The domain depends on @cellix/domain-seedwork only. Move infrastructure, persistence, and transport code to its own layer and depend on it through a domain interface.',
	},
	{
		layer: 'service-mongoose',
		sourceDir: 'packages/axc/service-mongoose/src',
		packageJson: 'packages/axc/service-mongoose/package.json',
		forbiddenPackages: ['@axc/domain', '@axc/persistence', '@axc/application-services', '@axc/rest', '@apps/', 'hono', '@marplex/', '@azure/functions'],
		guidance: 'service-mongoose holds Mongoose models and the Mongoose infrastructure service (Cellix data-sources-mongoose-models role). It must not know about higher layers; persistence maps models to domain objects.',
	},
	{
		layer: 'persistence',
		sourceDir: 'packages/axc/persistence/src',
		packageJson: 'packages/axc/persistence/package.json',
		forbiddenPackages: ['@axc/application-services', '@axc/rest', '@apps/', 'hono', '@marplex/', '@azure/functions'],
		guidance: 'persistence implements domain repositories and readonly data sources over service-mongoose models. Use cases belong in application-services, HTTP in rest.',
	},
	{
		layer: 'application-services',
		sourceDir: 'packages/axc/application-services/src',
		packageJson: 'packages/axc/application-services/package.json',
		forbiddenPackages: ['@axc/rest', '@axc/service-mongoose', '@apps/', 'hono', '@marplex/', '@azure/functions', 'mongoose', 'mongodb', '@cellix/mongoose-seedwork'],
		guidance: 'application-services reaches data only through the DataSources exposed by @axc/persistence, and knows nothing about HTTP.',
	},
	{
		layer: 'rest',
		sourceDir: 'packages/axc/rest/src',
		packageJson: 'packages/axc/rest/package.json',
		forbiddenPackages: ['@axc/domain', '@axc/persistence', '@axc/service-mongoose', '@apps/', '@cellix/domain-seedwork', '@cellix/mongoose-seedwork', 'mongoose', 'mongodb'],
		guidance: 'rest only translates HTTP to application-services calls. Export the types and error results rest needs from @axc/application-services.',
	},
	{
		layer: 'acceptance-api',
		sourceDir: 'packages/axc-verification/acceptance-api/src',
		packageJson: 'packages/axc-verification/acceptance-api/package.json',
		forbiddenPackages: ['@axc/', '@apps/', 'hono', '@marplex/'],
		guidance: 'Acceptance tests drive the real @apps/api host over HTTP (Send/LastResponse). Never import application code or build a Hono app inside them; assert against the seed data the host loads.',
	},
];

const specifierPattern = /\b(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,]+?\s+from\s+)?['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

export function importSpecifiers(content: string): string[] {
	return [...content.matchAll(specifierPattern)].map((match) => match[1] ?? match[2] ?? match[3] ?? '').filter(Boolean);
}

function matchesPackage(specifier: string, packageName: string): boolean {
	if (packageName.endsWith('/')) {
		return specifier.startsWith(packageName);
	}
	return specifier === packageName || specifier.startsWith(`${packageName}/`);
}

function isBareSpecifier(specifier: string): boolean {
	return !specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('node:');
}

function disallowed(boundary: LayerBoundary, specifier: string): boolean {
	if (!isBareSpecifier(specifier)) {
		return false;
	}
	if (boundary.allowedPackages && !boundary.allowedPackages.some((allowed) => matchesPackage(specifier, allowed))) {
		return true;
	}
	return (boundary.forbiddenPackages ?? []).some((forbidden) => matchesPackage(specifier, forbidden));
}

export function layerImportViolations(boundary: LayerBoundary, files: readonly SourceFile[]): string[] {
	const violations: string[] = [];
	for (const file of files) {
		if (isTestFile(file.path)) {
			continue;
		}
		for (const specifier of importSpecifiers(codeOf(file))) {
			if (disallowed(boundary, specifier)) {
				violations.push(`[${file.path}] ${boundary.layer} must not import '${specifier}'. ${boundary.guidance}`);
			}
		}
	}
	return violations;
}

/** Runtime dependencies must respect the same boundary; dev tooling (config, test runners) is checked against the forbidden list only. */
export function layerDependencyViolations(boundary: LayerBoundary, packageJson: SourceFile): string[] {
	const manifest = JSON.parse(packageJson.content) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
	const violations: string[] = [];
	for (const name of Object.keys(manifest.dependencies ?? {})) {
		if (disallowed(boundary, name)) {
			violations.push(`[${packageJson.path}] ${boundary.layer} must not depend on '${name}'. ${boundary.guidance}`);
		}
	}
	for (const name of Object.keys(manifest.devDependencies ?? {})) {
		if ((boundary.forbiddenPackages ?? []).some((forbidden) => matchesPackage(name, forbidden))) {
			violations.push(`[${packageJson.path}] ${boundary.layer} must not depend on '${name}' (devDependencies). ${boundary.guidance}`);
		}
	}
	return violations;
}
