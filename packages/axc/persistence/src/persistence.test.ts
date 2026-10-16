import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import type { Domain } from '@axc/domain';
import { ServiceMongoose } from '@axc/service-mongoose';
import { afterAll, beforeAll, expect } from 'vitest';
import { type DataSources, Persistence } from './index.ts';

type CoursePage = Domain.Contexts.Training.Course.CoursePage;
type EnrollmentRequestRecord = Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestRecord;
type EnrollmentRequestStatus = Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestStatus;
let dataSources: DataSources;
const now = '2026-06-27T10:00:00.000Z';
const later = '2026-06-28T10:00:00.000Z';
const criteria = { page: 1, pageSize: 50, sort: 'title' } as const;
const mongo = new ServiceMongoose(undefined, async (service) => {
	dataSources = await Persistence(service, true);
});
beforeAll(async () => {
	await mongo.startUp();
}, 120_000);
afterAll(async () => {
	await mongo.shutDown();
});
const input = (email: string, courseId = 'course-001') => ({ courseId, learnerEmail: email, justification: 'I need this course for upcoming work.' });
async function insert(email: string, courseId = 'course-001'): Promise<EnrollmentRequestRecord> {
	let saved: EnrollmentRequestRecord | undefined;
	const id = crypto.randomUUID();
	await dataSources.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repository) => {
		const aggregate = await repository.getNewInstance(input(email, courseId), id, now);
		saved = (await repository.save(aggregate)).props.record;
	});
	if (saved === undefined) {
		throw new Error('fixture was not saved');
	}
	return saved;
}
async function transition(id: string, status: EnrollmentRequestStatus): Promise<void> {
	await dataSources.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repository) => {
		const aggregate = await repository.findById(id);
		if (aggregate === undefined) {
			throw new Error('fixture was not found');
		}
		aggregate.changeStatus({ id, status, changedBy: 'reviewer', reason: 'Prerequisite missing' }, later);
		await repository.save(aggregate);
	});
}
const feature = await loadFeature('src/features/persistence.feature');
describeFeature(feature, ({ Scenario }) => {
	Scenario('Seed contains a mixed catalog', ({ Given, When, Then }) => {
		let result: unknown;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			result = await dataSources.readonlyDataSource.Training.Course.search(criteria);
		});
		Then('the database result is correct', () => {
			const page = result as CoursePage;
			expect(page.totalItems).toBe(12);
			expect(new Set(page.items.map((course) => course.modality)).size).toBe(3);
			expect(new Set(page.items.map((course) => course.status)).size).toBe(3);
		});
	});
	Scenario('Mongo keyword matches all searchable fields', ({ Given, When, Then }) => {
		let result: unknown;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			result = await dataSources.readonlyDataSource.Training.Course.search({ ...criteria, q: 'SECURITY' });
		});
		Then('the database result is correct', () => {
			expect((result as CoursePage).items.map((course) => course.id).sort()).toEqual(['course-001', 'course-002', 'course-007', 'course-011']);
		});
	});
	Scenario('Mongo combines filters', ({ Given, When, Then }) => {
		let result: unknown;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			result = await dataSources.readonlyDataSource.Training.Course.search({ ...criteria, q: 'security', modality: 'online', status: 'active', tag: 'AI' });
		});
		Then('the database result is correct', () => {
			expect((result as CoursePage).items.map((course) => course.id)).toEqual(['course-001']);
		});
	});
	Scenario('Mongo sorts by title', ({ Given, When, Then }) => {
		let result: unknown;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			result = await dataSources.readonlyDataSource.Training.Course.search({ ...criteria, sort: 'title' });
		});
		Then('the database result is correct', () => {
			const values = (result as CoursePage).items.map((course) => course.title);
			expect(values).toEqual([...values].sort());
		});
	});
	Scenario('Mongo sorts by createdAt', ({ Given, When, Then }) => {
		let result: unknown;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			result = await dataSources.readonlyDataSource.Training.Course.search({ ...criteria, sort: 'createdAt' });
		});
		Then('the database result is correct', () => {
			const values = (result as CoursePage).items.map((course) => course.createdAt);
			expect(values).toEqual([...values].sort());
		});
	});
	Scenario('Mongo sorts by updatedAt', ({ Given, When, Then }) => {
		let result: unknown;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			result = await dataSources.readonlyDataSource.Training.Course.search({ ...criteria, sort: 'updatedAt' });
		});
		Then('the database result is correct', () => {
			const values = (result as CoursePage).items.map((course) => course.updatedAt);
			expect(values).toEqual([...values].sort());
		});
	});
	Scenario('Mongo pagination uses skip limit and count', ({ Given, When, Then }) => {
		let result: unknown;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			result = await dataSources.readonlyDataSource.Training.Course.search({ ...criteria, page: 2, pageSize: 5 });
		});
		Then('the database result is correct', () => {
			const page = result as CoursePage;
			expect(page.items).toHaveLength(5);
			expect(page.items[0]?.title).toBe('Draft TypeScript');
			expect(page).toMatchObject({ totalItems: 12, page: 2, pageSize: 5, totalPages: 3 });
		});
	});
	Scenario('Mongo treats regex symbols literally', ({ Given, When, Then }) => {
		let result: unknown;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			result = await dataSources.readonlyDataSource.Training.Course.search({ ...criteria, q: '.*' });
		});
		Then('the database result is correct', () => {
			expect(result).toMatchObject({ items: [], totalItems: 0, totalPages: 0 });
		});
	});
	Scenario('Mongo treats tag symbols literally', ({ Given, When, Then }) => {
		let result: unknown;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			result = await dataSources.readonlyDataSource.Training.Course.search({ ...criteria, tag: '.*' });
		});
		Then('the database result is correct', () => {
			expect(result).toMatchObject({ items: [], totalItems: 0 });
		});
	});
	Scenario('Mongo looks up known course', ({ Given, When, Then }) => {
		let result: unknown;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			result = await dataSources.readonlyDataSource.Training.Course.getById('course-001');
		});
		Then('the database result is correct', () => {
			expect(result).toMatchObject({ id: 'course-001', status: 'active' });
		});
	});
	Scenario('Mongo returns undefined for absent course', ({ Given, When, Then }) => {
		let result: unknown;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			result = await dataSources.readonlyDataSource.Training.Course.getById('missing');
		});
		Then('the database result is correct', () => {
			expect(result).toBeUndefined();
		});
	});
	Scenario('Transaction persists creation history', ({ Given, When, Then }) => {
		let result: unknown;
		const email = `learner-${crypto.randomUUID()}@example.org`;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			const record = await insert(email);
			result = await dataSources.readonlyDataSource.Training.EnrollmentRequest.getById(record.id);
		});
		Then('the database result is correct', () => {
			expect(result).toMatchObject({ status: 'pending', statusHistory: [{ fromStatus: null, toStatus: 'pending', changedBy: 'system', changedAt: now, reason: null }] });
		});
	});
	Scenario('Transaction prevents duplicate pending requests', ({ Given, When, Then }) => {
		let result: unknown;
		const email = `learner-${crypto.randomUUID()}@example.org`;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			await insert(email);
			try {
				await insert(email.toUpperCase());
			} catch (caught) {
				result = caught;
			}
		});
		Then('the database result is correct', () => {
			expect(result).toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });
		});
	});
	Scenario('Transaction prevents duplicate approved requests', ({ Given, When, Then }) => {
		let result: unknown;
		const email = `learner-${crypto.randomUUID()}@example.org`;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			const first = await insert(email);
			await transition(first.id, 'approved');
			try {
				await insert(email);
			} catch (caught) {
				result = caught;
			}
		});
		Then('the database result is correct', () => {
			expect(result).toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });
		});
	});
	Scenario('Concurrent creation has one winner', ({ Given, When, Then }) => {
		let result: unknown;
		const email = `learner-${crypto.randomUUID()}@example.org`;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			result = await Promise.allSettled([insert(email), insert(email)]);
		});
		Then('the database result is correct', async () => {
			const settled = result as PromiseSettledResult<EnrollmentRequestRecord>[];
			expect(settled.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
			const rejected = settled.find((item) => item.status === 'rejected');
			expect(rejected).toMatchObject({ reason: { code: 'DUPLICATE_ACTIVE_REQUEST' } });
			expect(await dataSources.readonlyDataSource.Training.EnrollmentRequest.list({ learnerEmail: email })).toHaveLength(1);
		});
	});
	Scenario('Terminal cancelled releases duplicate constraint', ({ Given, When, Then }) => {
		let result: unknown;
		const email = `learner-${crypto.randomUUID()}@example.org`;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			const first = await insert(email);
			await transition(first.id, 'cancelled');
			result = await insert(email);
		});
		Then('the database result is correct', async () => {
			expect(result).toMatchObject({ status: 'pending' });
			expect(await dataSources.readonlyDataSource.Training.EnrollmentRequest.list({ learnerEmail: email })).toHaveLength(2);
		});
	});
	Scenario('Terminal rejected releases duplicate constraint', ({ Given, When, Then }) => {
		let result: unknown;
		const email = `learner-${crypto.randomUUID()}@example.org`;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			const first = await insert(email);
			await transition(first.id, 'rejected');
			result = await insert(email);
		});
		Then('the database result is correct', async () => {
			expect(result).toMatchObject({ status: 'pending' });
			expect(await dataSources.readonlyDataSource.Training.EnrollmentRequest.list({ learnerEmail: email })).toHaveLength(2);
		});
	});
	Scenario('Concurrent status changes do not lose history', ({ Given, When, Then }) => {
		let result: unknown;
		const email = `learner-${crypto.randomUUID()}@example.org`;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			const first = await insert(email);
			result = await Promise.allSettled([transition(first.id, 'approved'), transition(first.id, 'approved')]);
			const saved = await dataSources.readonlyDataSource.Training.EnrollmentRequest.getById(first.id);
			expect(saved?.statusHistory).toHaveLength(2);
		});
		Then('the database result is correct', () => {
			const settled = result as PromiseSettledResult<void>[];
			expect(settled.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
			expect(settled.find((item) => item.status === 'rejected')).toMatchObject({ reason: { code: 'INVALID_STATUS_TRANSITION' } });
		});
	});
	Scenario('Failed transaction rolls back creation', ({ Given, When, Then }) => {
		let result: unknown;
		const email = `learner-${crypto.randomUUID()}@example.org`;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			try {
				await dataSources.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repository) => {
					const aggregate = await repository.getNewInstance(input(email), crypto.randomUUID(), now);
					await repository.save(aggregate);
					throw new Error('rollback probe');
				});
			} catch (caught) {
				result = caught;
			}
		});
		Then('the database result is correct', async () => {
			expect(result).toMatchObject({ message: 'rollback probe' });
			expect(await dataSources.readonlyDataSource.Training.EnrollmentRequest.list({ learnerEmail: email })).toEqual([]);
		});
	});
	Scenario('Failed status transaction rolls back audit', ({ Given, When, Then }) => {
		let result: unknown;
		const email = `learner-${crypto.randomUUID()}@example.org`;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			const first = await insert(email);
			try {
				await dataSources.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repository) => {
					const aggregate = await repository.findById(first.id);
					if (aggregate === undefined) {
						throw new Error('fixture missing');
					}
					aggregate.changeStatus({ id: first.id, status: 'approved', changedBy: 'reviewer' }, later);
					await repository.save(aggregate);
					throw new Error('rollback probe');
				});
			} catch (caught) {
				result = caught;
			}
			const saved = await dataSources.readonlyDataSource.Training.EnrollmentRequest.getById(first.id);
			expect(saved).toMatchObject({ status: 'pending', statusHistory: [expect.objectContaining({ toStatus: 'pending' })] });
		});
		Then('the database result is correct', () => {
			expect(result).toMatchObject({ message: 'rollback probe' });
		});
	});
	Scenario('Mongo filters enrollment status', ({ Given, When, Then }) => {
		let result: unknown;
		const email = `learner-${crypto.randomUUID()}@example.org`;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			const first = await insert(email);
			await transition(first.id, 'approved');
			await insert(email, 'course-002');
			result = await dataSources.readonlyDataSource.Training.EnrollmentRequest.list({ status: 'approved' });
		});
		Then('the database result is correct', () => {
			const records = result as EnrollmentRequestRecord[];
			expect(records.length).toBeGreaterThan(0);
			expect(records.every((record) => record.status === 'approved')).toBe(true);
		});
	});
	Scenario('Mongo filters enrollment courseId', ({ Given, When, Then }) => {
		let result: unknown;
		const email = `learner-${crypto.randomUUID()}@example.org`;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			const first = await insert(email);
			await transition(first.id, 'approved');
			await insert(email, 'course-002');
			result = await dataSources.readonlyDataSource.Training.EnrollmentRequest.list({ courseId: 'course-002' });
		});
		Then('the database result is correct', () => {
			const records = result as EnrollmentRequestRecord[];
			expect(records.length).toBeGreaterThan(0);
			expect(records.every((record) => record.courseId === 'course-002')).toBe(true);
		});
	});
	Scenario('Mongo filters enrollment learnerEmail', ({ Given, When, Then }) => {
		let result: unknown;
		const email = `learner-${crypto.randomUUID()}@example.org`;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			const first = await insert(email);
			await transition(first.id, 'approved');
			await insert(email, 'course-002');
			result = await dataSources.readonlyDataSource.Training.EnrollmentRequest.list({ learnerEmail: email.toUpperCase() });
		});
		Then('the database result is correct', () => {
			const records = result as EnrollmentRequestRecord[];
			expect(records.length).toBeGreaterThan(0);
			expect(records.every((record) => record.learnerEmail === email)).toBe(true);
		});
	});
	Scenario('Mongo combines enrollment filters', ({ Given, When, Then }) => {
		let result: unknown;
		const email = `learner-${crypto.randomUUID()}@example.org`;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			const first = await insert(email);
			await transition(first.id, 'approved');
			await insert(email, 'course-002');
			result = await dataSources.readonlyDataSource.Training.EnrollmentRequest.list({ learnerEmail: email, status: 'approved', courseId: 'course-001' });
		});
		Then('the database result is correct', () => {
			expect(result).toEqual([expect.objectContaining({ learnerEmail: email, courseId: 'course-001', status: 'approved' })]);
		});
	});
	Scenario('Mongo empty enrollment lookup', ({ Given, When, Then }) => {
		let result: unknown;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			result = await dataSources.readonlyDataSource.Training.EnrollmentRequest.getById('absent');
		});
		Then('the database result is correct', () => {
			expect(result).toBeUndefined();
		});
	});
	Scenario('Mongo empty enrollment list', ({ Given, When, Then }) => {
		let result: unknown;
		Given('initialized sample persistence', () => {
			expect(dataSources).toBeDefined();
		});
		When('the repository operation runs', async () => {
			result = await dataSources.readonlyDataSource.Training.EnrollmentRequest.list({ learnerEmail: 'absent@example.org' });
		});
		Then('the database result is correct', () => {
			expect(result).toEqual([]);
		});
	});
});
