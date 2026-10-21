import { describe, expect, it } from 'vitest';
import { applicationServicesLayoutViolations, compositionRootViolations, inMemoryStandInViolations, placementViolations, seedworkNamespaceViolations } from './rules/cellix-structure.ts';
import { importSpecifiers, layerBoundaries, layerDependencyViolations, layerImportViolations } from './rules/layer-imports.ts';
import { parseTaskSetCriteria, referencedCriteria, traceabilityViolations } from './rules/requirements-traceability.ts';
import { azureRegistrations, honoRoutes, normalizeRoutePath, routeParityViolations } from './rules/route-parity.ts';
import { isTestFile, listRepoFiles, readRepoFile, readSourceFiles, type SourceFile } from './support/workspace.ts';

const file = (path: string, content: string): SourceFile => ({ path, content });

function boundary(layer: string) {
	const found = layerBoundaries.find((candidate) => candidate.layer === layer);
	if (!found) {
		throw new Error(`unknown layer ${layer}`);
	}
	return found;
}

function requiredFile(relativePath: string): SourceFile {
	const found = readRepoFile(relativePath);
	if (!found) {
		throw new Error(`${relativePath} is missing`);
	}
	return found;
}

describe('layer import boundaries', () => {
	for (const layer of layerBoundaries) {
		it(`${layer.layer} imports respect the layer boundary`, () => {
			const sources = readSourceFiles(layer.sourceDir);
			expect(sources.length).toBeGreaterThan(0);
			expect(layerImportViolations(layer, sources)).toStrictEqual([]);
		});

		it(`${layer.layer} package.json dependencies respect the layer boundary`, () => {
			expect(layerDependencyViolations(layer, requiredFile(layer.packageJson))).toStrictEqual([]);
		});
	}

	describe('rule self-checks', () => {
		it('reads static, type-only, re-export, side-effect, and dynamic imports', () => {
			const content = [
				"import { a } from 'pkg-a';",
				"import type { B } from '@scope/b/sub';",
				"export * from './local.ts';",
				"import 'side-effect';",
				"const c = await import('pkg-c');",
				"import {\n\tmultiLine,\n} from 'pkg-d';",
			].join('\n');
			expect(importSpecifiers(content)).toStrictEqual(['pkg-a', '@scope/b/sub', './local.ts', 'side-effect', 'pkg-c', 'pkg-d']);
		});

		it('domain allows only domain-seedwork, relative, and node: imports', () => {
			const domain = boundary('domain');
			const ok = file('packages/axc/domain/src/a.ts', "import type { Repository } from '@cellix/domain-seedwork/repository';\nimport { b } from './b.ts';\nimport path from 'node:path';");
			const bad = file('packages/axc/domain/src/a.ts', "import { Schema } from 'mongoose';\nimport type { X } from '@axc/persistence';");
			expect(layerImportViolations(domain, [ok])).toStrictEqual([]);
			expect(layerImportViolations(domain, [bad])).toHaveLength(2);
		});

		it('rest may not reach past application-services', () => {
			const rest = boundary('rest');
			const bad = file('packages/axc/rest/src/a.ts', "import { InMemoryRepo } from '@axc/persistence';\nimport type { Course } from '@axc/domain';");
			const ok = file('packages/axc/rest/src/a.ts', "import type { ApplicationServicesFactory } from '@axc/application-services';\nimport { Hono } from 'hono';");
			expect(layerImportViolations(rest, [bad])).toHaveLength(2);
			expect(layerImportViolations(rest, [ok])).toStrictEqual([]);
		});

		it('acceptance tests may not import application code or Hono', () => {
			const bad = file('packages/axc-verification/acceptance-api/src/steps.ts', "import { createRestApp } from '@axc/rest';\nimport { Hono } from 'hono';");
			expect(layerImportViolations(boundary('acceptance-api'), [bad])).toHaveLength(2);
		});

		it('test files are exempt from import boundaries', () => {
			const testFile = file('packages/axc/application-services/src/a.test.ts', "import { x } from '@axc/persistence';\nimport mongoose from 'mongoose';");
			expect(layerImportViolations(boundary('application-services'), [testFile])).toStrictEqual([]);
		});

		it('flags forbidden runtime and dev dependencies', () => {
			const manifest = file('packages/axc/rest/package.json', JSON.stringify({ dependencies: { '@axc/persistence': 'workspace:*', hono: 'catalog:' }, devDependencies: { mongoose: 'catalog:' } }));
			expect(layerDependencyViolations(boundary('rest'), manifest)).toHaveLength(2);
		});
	});
});

describe('Hono routes and Azure Function registrations', () => {
	it('every Hono route is registered in apps/api and every registration has a Hono route', () => {
		const hono = honoRoutes(readSourceFiles('packages/axc/rest/src'));
		const azure = azureRegistrations(requiredFile('apps/api/src/index.ts'));
		expect([...hono.violations, ...azure.violations]).toStrictEqual([]);
		expect(hono.routes.length).toBeGreaterThan(0);
		expect(routeParityViolations(hono.routes, azure.routes)).toStrictEqual([]);
	});

	describe('rule self-checks', () => {
		it('treats Hono :params and Azure {params} as the same path', () => {
			expect(normalizeRoutePath('/api/things/:id')).toBe('api/things/{id}');
			expect(normalizeRoutePath('api/things/{id:guid}')).toBe('api/things/{id}');
			expect(normalizeRoutePath('/api/things/:id{[0-9]+}/status')).toBe('api/things/{id}/status');
		});

		it('reports unregistered Hono routes and registrations without a route', () => {
			const rest = file('packages/axc/rest/src/index.ts', "app.get('/health', h);\napp.get('/api/things', h);\napp.patch('/api/things/:id/status', h);");
			const api = file(
				'apps/api/src/index.ts',
				[
					".registerAzureFunctionHttpHandler('health', { route: 'health', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)",
					".registerAzureFunctionHttpHandler('things-status', { route: 'api/things/{id}/status', methods: ['PATCH'], authLevel: 'anonymous' }, restHandlerCreator)",
					".registerAzureFunctionHttpHandler('orphan', { route: 'api/orphan', methods: ['POST'], authLevel: 'anonymous' }, restHandlerCreator)",
				].join('\n'),
			);
			const violations = routeParityViolations(honoRoutes([rest]).routes, azureRegistrations(api).routes);
			expect(violations).toHaveLength(2);
			expect(violations[0]).toContain('GET /api/things is unreachable');
			expect(violations[1]).toContain('POST /api/orphan has no matching Hono route');
		});

		it('requires full Hono paths and explicit Azure methods', () => {
			expect(honoRoutes([file('packages/axc/rest/src/a.ts', "app.route('/api', things);")]).violations).toHaveLength(1);
			expect(azureRegistrations(file('apps/api/src/index.ts', ".registerAzureFunctionHttpHandler('x', { route: 'api/x', authLevel: 'anonymous' }, h)")).violations).toHaveLength(1);
		});
	});
});

describe('Cellix layout', () => {
	const domain = readSourceFiles('packages/axc/domain/src');
	const persistence = readSourceFiles('packages/axc/persistence/src');
	const serviceMongoose = readSourceFiles('packages/axc/service-mongoose/src');
	const applicationServices = readSourceFiles('packages/axc/application-services/src');

	it('aggregates, repositories, units of work, visas, adapters, data sources, and models use Cellix names and folders', () => {
		expect(placementViolations([...domain, ...persistence, ...serviceMongoose])).toStrictEqual([]);
	});

	it('domain extends seedwork through the DomainSeedwork / PassportSeedwork namespaces', () => {
		expect(seedworkNamespaceViolations(domain)).toStrictEqual([]);
	});

	it('application services live under src/contexts', () => {
		expect(applicationServicesLayoutViolations(applicationServices)).toStrictEqual([]);
	});

	it('no in-memory stand-ins replace the Mongoose persistence path', () => {
		expect(inMemoryStandInViolations([...persistence, ...serviceMongoose, ...applicationServices, ...readSourceFiles('apps/api/src')])).toStrictEqual([]);
	});

	it('the composition root does not construct repositories or data sources', () => {
		expect(compositionRootViolations(readSourceFiles('apps/api/src'))).toStrictEqual([]);
	});

	describe('rule self-checks', () => {
		it('accepts constructs in their Cellix files', () => {
			const ok = [
				file('packages/axc/domain/src/domain/contexts/course/course/course.aggregate.ts', 'export class Course<P> extends DomainSeedwork.AggregateRoot<P, Passport> {}'),
				file('packages/axc/domain/src/domain/contexts/course/course/course.repository.ts', 'export interface CourseRepository<P> extends DomainSeedwork.Repository<Course<P>> {}'),
				file('packages/axc/domain/src/domain/contexts/course/course.visa.ts', 'export interface CourseVisa extends PassportSeedwork.Visa<CourseDomainPermissions> {}'),
				file('packages/axc/persistence/src/datasources/domain/course/course/course.repository.ts', 'export class CourseRepository extends MongooseSeedwork.MongoRepositoryBase<A, B, C, D> {}'),
				file('packages/axc/persistence/src/datasources/readonly/course/course/course.data.ts', 'export class CourseDataSourceImpl extends MongoDataSourceImpl<Course> {}'),
				file('packages/axc/service-mongoose/src/models/course/course.model.ts', 'export const CourseSchema = new Schema<Course>({});'),
				file('packages/axc/domain/src/domain/seedwork/index.ts', '// matches `extends DomainSeedwork.AggregateRoot<`\n/* new Schema( */\nexport * as DomainSeedwork from "./domain-seedwork.ts";'),
			];
			expect(placementViolations(ok)).toStrictEqual([]);
			expect(seedworkNamespaceViolations(ok)).toStrictEqual([]);
		});

		it('rejects constructs outside their Cellix files', () => {
			const bad = [
				file('packages/axc/domain/src/course.ts', 'export class Course extends AggregateRoot<P, Passport> {}'),
				file('packages/axc/persistence/src/course-repository.ts', 'export class CourseRepository extends MongooseSeedwork.MongoRepositoryBase<A, B, C, D> {}'),
				file('packages/axc/service-mongoose/src/course.ts', 'export const CourseSchema = new Schema<Course>({});'),
			];
			expect(placementViolations(bad)).toHaveLength(3);
			expect(seedworkNamespaceViolations([file('packages/axc/domain/src/domain/contexts/c/a/a.aggregate.ts', 'class A extends AggregateRoot<P, X> {}')])).toHaveLength(1);
		});

		it('rejects use cases outside src/contexts', () => {
			expect(applicationServicesLayoutViolations([file('packages/axc/application-services/src/course-catalog.ts', 'export const x = 1;')])).toHaveLength(1);
			expect(applicationServicesLayoutViolations([file('packages/axc/application-services/src/contexts/course/course/query.ts', 'export const query = (dataSources: DataSources) => async () => 1;')])).toStrictEqual([]);
		});

		it('rejects in-memory stand-ins and direct construction in the composition root', () => {
			expect(inMemoryStandInViolations([file('packages/axc/persistence/src/repo.ts', 'export class InMemoryCourseCatalogRepository {}')])).toHaveLength(1);
			expect(compositionRootViolations([file('apps/api/src/index.ts', 'courseCatalog: new InMemoryCourseCatalogRepository(),')])).toHaveLength(1);
			expect(compositionRootViolations([file('apps/api/src/index.ts', 'registry.registerInfrastructureService(new ServiceMongoose(uri));')])).toStrictEqual([]);
		});
	});
});

describe('requirements traceability', () => {
	const testFiles = [
		...readSourceFiles('packages/axc-verification/acceptance-api/src', ['.feature', '.ts']),
		...readSourceFiles('packages/axc-verification/archunit-tests/src').filter((candidate) => !candidate.path.endsWith('/axc-layer-rules.test.ts')),
		...readSourceFiles('packages/axc').filter((candidate) => isTestFile(candidate.path)),
		...readSourceFiles('apps/api').filter((candidate) => isTestFile(candidate.path)),
	];
	const referenced = referencedCriteria(testFiles);

	for (const requirementsFile of listRepoFiles(/^task-set-[\w-]+-requirements\.md$/)) {
		it(`${requirementsFile}: once traced, every acceptance criterion has a test`, () => {
			expect(traceabilityViolations(parseTaskSetCriteria(requiredFile(requirementsFile)), referenced)).toStrictEqual([]);
		});
	}

	describe('rule self-checks', () => {
		const requirements = file('task-set-z-requirements.md', ['| Task Set ID | TS-Z-SAMPLE |', '| Z-AC1 | List works. |', '| Z-AC2 | Filter works. |', '| Z-AC3 | Existing tests still pass. |'].join('\n'));

		it('ignores task sets with no traced criteria and non-testable rows', () => {
			const criteria = parseTaskSetCriteria(requirements);
			expect(criteria.criteria.map((criterion) => criterion.id)).toStrictEqual(['Z-AC1', 'Z-AC2']);
			expect(traceabilityViolations(criteria, new Set())).toStrictEqual([]);
		});

		it('requires every criterion once one is traced, from Cucumber tags or test names', () => {
			const criteria = parseTaskSetCriteria(requirements);
			const partial = referencedCriteria([file('a.feature', '  @Z-AC1\n  Scenario: list')]);
			expect(traceabilityViolations(criteria, partial)).toHaveLength(1);
			const complete = referencedCriteria([file('a.feature', '  @Z-AC1\n  Scenario: list'), file('b.test.ts', "it('Z-AC2 filters', () => {});")]);
			expect(traceabilityViolations(criteria, complete)).toStrictEqual([]);
		});
	});
});
