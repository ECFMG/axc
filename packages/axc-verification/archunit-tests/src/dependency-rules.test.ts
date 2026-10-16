import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importedSpecifiers, isProductionSource, listFiles } from './support/source-files.ts';

// archunit's projectFiles() only sees files in the current package's tsconfig,
// so cross-package layering is checked by reading import specifiers directly.
const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const axcDir = path.resolve(packageDir, '../../axc');
const appsDir = path.resolve(packageDir, '../../../apps');

interface LayerRule {
	layer: string;
	folder: string;
	forbidden: string[];
}

const rules: LayerRule[] = [
	{
		layer: '@axc/domain',
		folder: path.join(axcDir, 'domain/src'),
		forbidden: ['hono', '@azure/', 'mongoose', 'mongodb', '@axc/rest', '@axc/persistence', '@axc/service-mongoose', '@axc/application-services', '@apps/', 'node:fs', 'node:http'],
	},
	{
		layer: '@axc/application-services',
		folder: path.join(axcDir, 'application-services/src'),
		forbidden: ['hono', '@azure/', 'mongoose', 'mongodb', '@axc/rest', '@axc/service-mongoose', '@apps/'],
	},
	{
		layer: '@axc/persistence',
		folder: path.join(axcDir, 'persistence/src'),
		forbidden: ['hono', '@azure/', '@axc/rest', '@axc/application-services', '@axc/service-mongoose', '@apps/'],
	},
	{
		layer: '@axc/rest',
		folder: path.join(axcDir, 'rest/src'),
		forbidden: ['mongoose', 'mongodb', '@axc/persistence', '@axc/service-mongoose', '@apps/'],
	},
	{
		layer: '@axc/service-mongoose',
		folder: path.join(axcDir, 'service-mongoose/src'),
		forbidden: ['hono', '@axc/rest', '@axc/application-services', '@axc/domain', '@axc/persistence', '@apps/'],
	},
];

describe('layer dependency rules', () => {
	for (const rule of rules) {
		it(`${rule.layer} does not import ${rule.forbidden.join(', ')}`, async () => {
			const files = await listFiles(rule.folder, isProductionSource);
			expect(files.length, `${rule.layer} has no sources under ${rule.folder}`).toBeGreaterThan(0);
			const violations: string[] = [];
			for (const file of files) {
				for (const specifier of importedSpecifiers(file.content)) {
					if (rule.forbidden.some((prefix) => specifier === prefix || specifier.startsWith(prefix))) {
						violations.push(`${file.relativePath} imports ${specifier}`);
					}
				}
			}
			expect(violations).toEqual([]);
		});
	}

	it('the api app composes packages but never reaches into their src folders', async () => {
		const files = await listFiles(path.join(appsDir, 'api/src'), isProductionSource);
		expect(files.length).toBeGreaterThan(0);
		const violations: string[] = [];
		for (const file of files) {
			for (const specifier of importedSpecifiers(file.content)) {
				if (/^(?:\.\.\/)+.*packages\//.test(specifier) || /@axc\/[\w-]+\/src\//.test(specifier)) {
					violations.push(`${file.relativePath} imports ${specifier}`);
				}
			}
		}
		expect(violations).toEqual([]);
	});

	it('axc packages import mongoose only through persistence and service-mongoose', async () => {
		const files = await listFiles(axcDir, isProductionSource);
		const violations: string[] = [];
		for (const file of files) {
			const allowed = file.path.includes('/persistence/') || file.path.includes('/service-mongoose/');
			if (allowed) {
				continue;
			}
			for (const specifier of importedSpecifiers(file.content)) {
				if (specifier === 'mongoose' || specifier.startsWith('mongoose/') || specifier.startsWith('@cellix/mongoose-seedwork')) {
					violations.push(`${file.relativePath} imports ${specifier}`);
				}
			}
		}
		expect(violations).toEqual([]);
	});
});
