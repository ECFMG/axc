import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { checkCellixLint } from './check.js';

const roots: string[] = [];

afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('Cellix lint', () => {
	it('accepts the agentCourses scaffold', async () => {
		const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
		await expect(checkCellixLint({ root })).resolves.toStrictEqual([]);
	});

	it('rejects helper modules, raw string setters, and action classes', async () => {
		const root = await scaffold({
			'packages/axc/domain/src/helpers.ts': 'export function formatName(name: string) { return name.trim(); }\n',
			'packages/axc/domain/src/course/course.aggregate.ts': `import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
export interface CourseProps { name: string }
export interface CourseEntityReference { readonly name: string }
export class Course extends AggregateRoot<CourseProps, Passport> {
  public static getNewInstance(): Course { return new Course({} as CourseProps, {} as Passport); }
  set name(name: string) { this.props.name = name; }
}
`,
			'packages/axc/application-services/src/contexts/course/create.ts': `export class CreateCourse {
  execute() { return null; }
}
`,
		});

		const violations = await checkCellixLint({ root });
		const text = violations.join('\n');
		expect(text).toContain('cellix/no-helper-module');
		expect(text).toContain('cellix/aggregate-value-object');
		expect(text).toContain('cellix/content-aggregate-setter');
		expect(text).toContain('cellix/application-action-no-class');
	});

	it('accepts a Cellix-shaped mutation and rejects a query that skips the read model', async () => {
		const root = await scaffold({
			'packages/axc/domain/src/course/course.aggregate.ts': aggregateSource,
			'packages/axc/domain/src/course/course.value-objects.ts': valueObjectSource,
			'packages/axc/application-services/src/contexts/course/index.ts': `import type { DataSources } from '@axc/persistence';
import { create } from './create.ts';
export interface CourseApplicationService {
  create: ReturnType<typeof create>;
}
export const Course = (dataSources: DataSources): CourseApplicationService => ({
  create: create(dataSources),
});
`,
			'packages/axc/application-services/src/contexts/course/create.ts': `import type { DataSources } from '@axc/persistence';
export interface CourseCreateCommand { name: string }
export const create = (dataSources: DataSources) => {
  return async (command: CourseCreateCommand): Promise<CourseEntityReference> => {
    return dataSources.domainDataSource.Course.Course.CourseUnitOfWork.withScopedTransaction(async () => command);
  };
};
`,
			'packages/axc/application-services/src/contexts/course/query-by-id.ts': `import type { DataSources } from '@axc/persistence';
export interface CourseQueryByIdCommand { id: string }
export const queryById = (dataSources: DataSources) => {
  return async (command: CourseQueryByIdCommand): Promise<string> => command.id;
};
`,
			'packages/axc/application-services/src/contexts/billing/create.ts': `import type { DataSources } from '@axc/persistence';
export interface BillingCreateCommand { name: string }
export const create = (dataSources: DataSources) => {
  return async (command: BillingCreateCommand): Promise<BillingEntityReference> => {
    return dataSources.domainDataSource.Billing.Billing.BillingUnitOfWork.withScopedTransaction(async () => command);
  };
};
`,
		});

		const violations = await checkCellixLint({ root });
		const text = violations.join('\n');
		expect(text).not.toContain('contexts/course/create.ts');
		expect(text).toContain('cellix/application-query');
		expect(text).toContain('cellix/content-query-call');
		expect(text).toContain('cellix/application-domain-name');
		expect(text).toContain('billing');
	});

	it('requires persistence repositories to implement the domain contract and models to use Cellix export names', async () => {
		const root = await scaffold({
			'packages/axc/persistence/src/datasources/domain/course/course/course.repository.ts': `export class CourseRepository extends MongoRepositoryBase<unknown, unknown, unknown, unknown> {
  find() { return null; }
}
`,
			'packages/axc/data-sources-mongoose-models/src/models/course/course.model.ts': 'export const CourseModel = {};\n',
		});

		const violations = await checkCellixLint({ root });
		const text = violations.join('\n');
		expect(text).toContain('cellix/persistence-repository-contract');
		expect(text).toContain('cellix/content-persistence-repository-body');
		expect(text).toContain('cellix/model-exports');
		expect(text).toContain('cellix/content-model-schema');
		expect(text).toContain('cellix/model-domain-name');
	});

	it('rejects a deep package import, a forbidden layer edge, and an import cycle', async () => {
		const root = await scaffold({
			'packages/axc/domain/src/course/course.aggregate.ts': `import { Course } from '@axc/domain/course/course.aggregate.ts';
import { save } from '@axc/persistence';
export const Course = Course;
export const saveCourse = save;
`,
			'packages/axc/application-services/src/contexts/course/a.ts': `import { b } from './b.ts';
export const a = b;
`,
			'packages/axc/application-services/src/contexts/course/b.ts': `import { a } from './a.ts';
export const b = a;
`,
		});

		const violations = await checkCellixLint({ root });
		const text = violations.join('\n');
		expect(text).toContain('cellix/visibility-public-export');
		expect(text).toContain('cellix/graph-layer');
		expect(text).toContain('cellix/graph-cycle');
	});

	it('rejects inline nested types, value objects that are not VO classes, and Promise<unknown>', async () => {
		const root = await scaffold({
			'packages/axc/domain/src/domain/contexts/course/course/course.aggregate.ts': aggregateSource.replace(
				'export interface CourseProps extends DomainEntityProps { name: string }',
				'export interface CourseProps extends DomainEntityProps {\n  name: string;\n  address: {\n    street: string;\n  };\n}',
			),
			'packages/axc/domain/src/domain/contexts/course/course/place.entity.ts': `import { DomainEntity } from '@cellix/domain-seedwork/domain-entity';
import type { DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';
export interface PlaceProps extends DomainEntityProps {
  label: string;
  geo: {
    lat: number;
  };
}
export interface PlaceEntityReference extends Readonly<PlaceProps> {}
export class Place extends DomainEntity<PlaceProps> implements PlaceEntityReference {
  constructor(props: PlaceProps) { super(props); }
  set label(label: string) { this.props.label = label; }
}
`,
			'packages/axc/domain/src/domain/contexts/course/course/address.value-objects.ts': `import { ValueObject } from '@cellix/domain-seedwork/value-object';
export class Address extends ValueObject<{ street: string }> {}
`,
			'packages/axc/domain/src/domain/contexts/course/course/title.value-objects.ts': `import { VOString } from '@lucaspaganini/value-objects';
export class Title extends VOString({ trim: true, minLength: 1, maxLength: 20 }) {
  normalize() { return this.valueOf(); }
}
`,
			'packages/axc/application-services/src/contexts/course/course/create.ts': `import type { DataSources } from '@axc/persistence';
export interface CourseCreateCommand { name: string }
export const create = (dataSources: DataSources) => {
  return async (command: CourseCreateCommand): Promise<unknown> => {
    return await dataSources.domainDataSource.Course.Course.CourseUnitOfWork.withScopedTransaction(async () => command);
  };
};
`,
			'packages/axc/graphql/src/schema/types/course.resolvers.ts': `const courseResolvers = {
  Mutation: {
    create: (_parent, args, context) => args.input,
  },
};
`,
			'packages/axc/graphql/src/schema/types/course.graphql': `input CourseFilter {
  name: String
}
extend type Mutation {
  create(input: CourseFilter): Course
}
`,
		});

		const violations = await checkCellixLint({ root });
		const text = violations.join('\n');
		expect(text).toContain('cellix/aggregate-nested-type');
		expect(text).toContain('cellix/entity-nested-type');
		expect(text).toContain('cellix/entity-value-object');
		expect(text).toContain('cellix/value-object-extends');
		expect(text).toContain('cellix/content-value-object-body');
		expect(text).toContain('cellix/content-action-result');
		expect(text).toContain('cellix/graphql-default-export');
		expect(text).toContain('cellix/graphql-context');
		expect(text).toContain('cellix/transport-application-services');
		expect(text).toContain('cellix/graphql-input-name');
		expect(text).toContain('cellix/graphql-mutation-result');
	});

	it('accepts a hand-written value object and entity that use named props', async () => {
		const root = await scaffold({
			'packages/axc/domain/src/domain/contexts/course/course/course.aggregate.ts': aggregateSource.replace(
				'export interface CourseProps extends DomainEntityProps { name: string }',
				'export interface CourseProps extends DomainEntityProps { name: string; address: AddressProps }',
			),
			'packages/axc/domain/src/domain/contexts/course/course/course.value-objects.ts': valueObjectSource,
			'packages/axc/domain/src/domain/contexts/course/course/address.value-objects.ts': `import { VOString } from '@lucaspaganini/value-objects';
export interface AddressProps { street: string }
export class Street extends VOString({ trim: true, minLength: 1, maxLength: 200 }) {}
`,
			'packages/axc/domain/src/domain/contexts/course/course/activity-log.value-objects.ts': `import { VOString } from '@lucaspaganini/value-objects';
export class ActivityType extends VOString({ trim: true, minLength: 1, maxLength: 200 }) {}
`,
			'packages/axc/domain/src/domain/contexts/course/course/activity-log.entity.ts': `import { DomainEntity, PermissionError } from '@cellix/domain-seedwork/domain-entity';
import type { DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';
import type { CourseVisa } from '../course.visa.ts';
import * as ValueObjects from './activity-log.value-objects.ts';
export interface ActivityLogProps extends DomainEntityProps { activityType: string }
export interface ActivityLogEntityReference extends Readonly<ActivityLogProps> {}
export class ActivityLog extends DomainEntity<ActivityLogProps> implements ActivityLogEntityReference {
  private isNew = false;
  private readonly visa: CourseVisa;
  constructor(props: ActivityLogProps, visa: CourseVisa) { super(props); this.visa = visa; }
  get activityType(): string { return this.props.activityType; }
  set activityType(activityType: string) {
    if (!this.isNew && !this.visa.determineIf((permissions) => permissions.canManageCourse)) {
      throw new PermissionError('You do not have permission to change activityType');
    }
    this.props.activityType = new ValueObjects.ActivityType(activityType).valueOf();
  }
}
`,
		});

		const violations = await checkCellixLint({ root });
		const text = violations.join('\n');
		expect(text).not.toContain('course.aggregate.ts');
		expect(text).not.toContain('address.value-objects.ts');
		expect(text).not.toContain('activity-log.entity.ts');
		expect(text).not.toContain('cellix/aggregate-nested-type');
		expect(text).not.toContain('cellix/entity-nested-type');
		expect(text).not.toContain('cellix/entity-value-object');
		expect(text).not.toContain('cellix/value-object-extends');
	});
});

const aggregateSource = `import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import { PermissionError } from '@cellix/domain-seedwork/domain-entity';
import type { DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';
import type { Passport } from '../passport.ts';
import type { CourseVisa } from '../course.visa.ts';
import * as ValueObjects from './course.value-objects.ts';

export interface CourseProps extends DomainEntityProps { name: string }
export interface CourseEntityReference extends Readonly<CourseProps> {}

export class Course<props extends CourseProps> extends AggregateRoot<props, Passport> implements CourseEntityReference {
  private isNew: boolean = false;
  private readonly visa: CourseVisa;
  constructor(props: props, passport: Passport) {
    super(props, passport);
    this.visa = passport.course.forCourse(this);
  }
  public static getNewInstance<props extends CourseProps>(newProps: props, name: string, passport: Passport): Course<props> {
    const course = new Course(newProps, passport);
    course.markAsNew();
    course.name = name;
    course.isNew = false;
    return course;
  }
  private markAsNew(): void {
    this.isNew = true;
  }
  get name(): string { return this.props.name; }
  set name(name: string) {
    if (!this.isNew && !this.visa.determineIf((permissions) => permissions.canManageCourse)) {
      throw new PermissionError('You do not have permission to change the name');
    }
    this.props.name = new ValueObjects.Name(name).valueOf();
  }
}
`;

const valueObjectSource = `import { VOString } from '@lucaspaganini/value-objects';
export class Name extends VOString({ trim: true, minLength: 1, maxLength: 200 }) {}
`;

async function scaffold(files: Record<string, string>): Promise<string> {
	const root = await mkdtemp(path.join(tmpdir(), 'cellix-lint-'));
	roots.push(root);
	await Promise.all(
		Object.entries(files).map(async ([relativePath, contents]) => {
			const fullPath = path.join(root, relativePath);
			await mkdir(path.dirname(fullPath), { recursive: true });
			await writeFile(fullPath, contents);
		}),
	);
	return root;
}
