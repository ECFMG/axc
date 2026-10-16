import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import type { Domain } from '@axc/domain';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import mongoose from 'mongoose';
import { afterAll, beforeAll, expect } from 'vitest';
import { Persistence } from '../../../../index.ts';

let server: MongoMemoryReplSet;
let sources: ReturnType<typeof Persistence>;
const now = new Date('2026-06-27T10:00:00Z');
beforeAll(async () => {
	server = await MongoMemoryReplSet.create({ binary: { version: '7.0.14' }, replSet: { count: 1 } });
	await mongoose.connect(server.getUri());
	sources = Persistence({ service: mongoose }, { now: () => now });
	await sources.initialize();
}, 60000);
afterAll(async () => {
	await mongoose.disconnect();
	if (server !== undefined) {
		await server.stop();
	}
});
const createRequest = async (email = 'learner@example.org'): Promise<string> => {
	let id: string | undefined;
	await sources.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repo) => {
		const request = await repo.getNewInstance({ courseId: 'course-001', learnerEmail: email, justification: 'x'.repeat(20) });
		id = (await repo.save(request)).id;
	});
	if (id === undefined) {
		throw new Error('Creation did not return an id');
	}
	return id;
};
const transition = async (id: string, status: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestStatus, reason?: string): Promise<void> => {
	await sources.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repo) => {
		const request = await repo.queryById(id);
		if (request === undefined) {
			throw new Error('Fixture missing');
		}
		request.changeStatus(status, { changedBy: 'reviewer' }, reason);
		await repo.save(request);
	});
};
const feature = await loadFeature(new URL('./features/enrollment-request.repository.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('Creation persists the pending audit entry', ({ Given, When, Then }) => {
		let action: () => Promise<void>;
		Given('an empty enrollment collection', async () => {
			await sources.models.EnrollmentRequest.deleteMany({});
		});
		When('a request is created', () => {
			action = async () => {
				const read = sources.readonlyDataSource.Training.EnrollmentRequest;
				await createRequest();
				const records = await read.list({});
				expect(records).toHaveLength(1);
				expect(records[0]?.statusHistory).toEqual([{ fromStatus: null, toStatus: 'pending', changedAt: now.toISOString(), changedBy: 'system', reason: null }]);
			};
		});
		Then('MongoDB stores 1 pending entry', async () => {
			await action();
		});
	});
	Scenario('Concurrent creations enforce unique active learner course', ({ Given, When, Then }) => {
		let action: () => Promise<void>;
		Given('an empty enrollment collection', async () => {
			await sources.models.EnrollmentRequest.deleteMany({});
		});
		When('two requests race for the same learner and course', () => {
			action = async () => {
				const read = sources.readonlyDataSource.Training.EnrollmentRequest;
				const results = await Promise.allSettled([createRequest(), createRequest()]);
				expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
				const failure = results.find((r) => r.status === 'rejected');
				expect(failure?.status === 'rejected' ? failure.reason : undefined).toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });
				expect(await read.list({})).toHaveLength(1);
			};
		});
		Then('only 1 request commits and the duplicate has a domain error', async () => {
			await action();
		});
	});
	Scenario('Approved requests block a second active request', ({ Given, When, Then }) => {
		let action: () => Promise<void>;
		Given('an empty enrollment collection', async () => {
			await sources.models.EnrollmentRequest.deleteMany({});
		});
		When('an approved request is followed by another creation', () => {
			action = async () => {
				const id = await createRequest();
				await transition(id, 'approved');
				await expect(createRequest()).rejects.toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });
			};
		});
		Then('the second request fails with DUPLICATE_ACTIVE_REQUEST', async () => {
			await action();
		});
	});
	Scenario('Case variations identify the same learner', ({ Given, When, Then }) => {
		let action: () => Promise<void>;
		Given('an empty enrollment collection', async () => {
			await sources.models.EnrollmentRequest.deleteMany({});
		});
		When('a mixed-case learner repeats enrollment', () => {
			action = async () => {
				await createRequest();
				await expect(createRequest('LEARNER@example.org')).rejects.toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });
			};
		});
		Then('the second active request is a duplicate', async () => {
			await action();
		});
	});
	Scenario('Rejected requests allow reapplication', ({ Given, When, Then }) => {
		let action: () => Promise<void>;
		Given('an empty enrollment collection', async () => {
			await sources.models.EnrollmentRequest.deleteMany({});
		});
		When('a rejected request is followed by another creation', () => {
			action = async () => {
				const read = sources.readonlyDataSource.Training.EnrollmentRequest;
				const id = await createRequest();
				await transition(id, 'rejected', 'Missing prerequisite');
				await createRequest();
				expect(await read.list({})).toHaveLength(2);
				expect(await read.list({ status: 'pending' })).toHaveLength(1);
			};
		});
		Then('2 records exist and only the new one is pending', async () => {
			await action();
		});
	});
	Scenario('Cancelled requests allow reapplication', ({ Given, When, Then }) => {
		let action: () => Promise<void>;
		Given('an empty enrollment collection', async () => {
			await sources.models.EnrollmentRequest.deleteMany({});
		});
		When('a cancelled request is followed by another creation', () => {
			action = async () => {
				const read = sources.readonlyDataSource.Training.EnrollmentRequest;
				const id = await createRequest();
				await transition(id, 'cancelled');
				await createRequest();
				expect(await read.list({ status: 'cancelled' })).toHaveLength(1);
				expect(await read.list({ status: 'pending' })).toHaveLength(1);
			};
		});
		Then('2 records exist with one pending and one cancelled', async () => {
			await action();
		});
	});
	Scenario('Combined enrollment filters use MongoDB', ({ Given, When, Then }) => {
		let action: () => Promise<void>;
		Given('an empty enrollment collection', async () => {
			await sources.models.EnrollmentRequest.deleteMany({});
		});
		When('requests are filtered by status course and email', () => {
			action = async () => {
				const read = sources.readonlyDataSource.Training.EnrollmentRequest;
				const id = await createRequest();
				await transition(id, 'approved');
				await createRequest('other@example.org');
				const records = await read.list({ status: 'approved', courseId: 'course-001', learnerEmail: 'LEARNER@example.org' });
				expect(records.map((r) => r.id)).toEqual([id]);
			};
		});
		Then('only the matching approved learner is returned', async () => {
			await action();
		});
	});
	Scenario('Unknown request id returns absence', ({ Given, When, Then }) => {
		let action: () => Promise<void>;
		Given('an empty enrollment collection', async () => {
			await sources.models.EnrollmentRequest.deleteMany({});
		});
		When('a malformed request id is queried', () => {
			action = async () => {
				const read = sources.readonlyDataSource.Training.EnrollmentRequest;
				const uow = sources.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork;
				expect(await read.queryById('not-an-object-id')).toBeUndefined();
				await uow.withScopedTransaction(async (repo) => {
					expect(await repo.queryById('not-an-object-id')).toBeUndefined();
				});
			};
		});
		Then('the read and write repositories return undefined', async () => {
			await action();
		});
	});
	Scenario('Missing valid request id returns absence', ({ Given, When, Then }) => {
		let action: () => Promise<void>;
		Given('an empty enrollment collection', async () => {
			await sources.models.EnrollmentRequest.deleteMany({});
		});
		When('an unknown ObjectId is queried', () => {
			action = async () => {
				const read = sources.readonlyDataSource.Training.EnrollmentRequest;
				expect(await read.queryById('012345678901234567890123')).toBeUndefined();
			};
		});
		Then('no request is returned for the valid id', async () => {
			await action();
		});
	});
	Scenario('History survives approval and cancellation', ({ Given, When, Then }) => {
		let action: () => Promise<void>;
		Given('an empty enrollment collection', async () => {
			await sources.models.EnrollmentRequest.deleteMany({});
		});
		When('approval is followed by cancellation', () => {
			action = async () => {
				const read = sources.readonlyDataSource.Training.EnrollmentRequest;
				const id = await createRequest();
				await transition(id, 'approved');
				await transition(id, 'cancelled', 'No longer needed');
				const record = await read.queryById(id);
				expect(record?.statusHistory.map((e) => [e.fromStatus, e.toStatus])).toEqual([
					[null, 'pending'],
					['pending', 'approved'],
					['approved', 'cancelled'],
				]);
				expect(record?.statusHistory[2]).toMatchObject({ changedBy: 'reviewer', reason: 'No longer needed' });
				expect(record?.status).toBe('cancelled');
			};
		});
		Then('3 ordered immutable audit entries are persisted', async () => {
			await action();
		});
	});
	Scenario('Transaction rollback preserves audit', ({ Given, When, Then }) => {
		let action: () => Promise<void>;
		Given('an empty enrollment collection', async () => {
			await sources.models.EnrollmentRequest.deleteMany({});
		});
		When('a saved approval transaction is aborted', () => {
			action = async () => {
				const read = sources.readonlyDataSource.Training.EnrollmentRequest;
				const uow = sources.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork;
				const id = await createRequest();
				await expect(
					uow.withScopedTransaction(async (repo) => {
						const request = await repo.queryById(id);
						if (request === undefined) {
							throw new Error('Fixture missing');
						}
						request.changeStatus('approved', { changedBy: 'reviewer' });
						await repo.save(request);
						throw new Error('abort');
					}),
				).rejects.toThrow('abort');
				const record = await read.queryById(id);
				expect(record?.status).toBe('pending');
				expect(record?.statusHistory).toHaveLength(1);
			};
		});
		Then('the stored request stays pending with 1 history entry', async () => {
			await action();
		});
	});
});
