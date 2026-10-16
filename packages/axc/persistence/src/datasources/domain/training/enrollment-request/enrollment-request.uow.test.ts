import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { Domain } from '@axc/domain';
import { ServiceMongoose } from '@axc/service-mongoose';
import { afterAll, beforeAll, expect } from 'vitest';
import { type DataSources, DataSourcesFactoryImpl } from '../../../../data-sources.ts';

const feature = await loadFeature(new URL('./features/enrollment-request.uow.feature', import.meta.url).pathname);
const service = new ServiceMongoose(undefined);
beforeAll(async () => {
	await service.startUp();
});
afterAll(async () => {
	await service.shutDown();
});
const E = Domain.Contexts.Training.EnrollmentRequest;
const now = '2026-06-27T10:00:00.000Z';
function request(id: string, email = 'learner@example.org', courseId = 'course-001') {
	return E.EnrollmentRequest.create(id, { courseId, learnerEmail: email, justification: 'I need this course for work.' }, { status: 'active' }, now);
}
async function sources(): Promise<DataSources> {
	const factory = new DataSourcesFactoryImpl(service);
	await factory.initialize(true);
	return factory.getDataSources();
}
describeFeature(feature, ({ Scenario }) => {
	Scenario('Requests survive reads and filters', ({ Then }) => {
		Then('request snapshots and audit entries round trip and every filter is applied', async () => {
			const data = await sources();
			const uow = data.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork;
			const read = data.readonlyDataSource.Training.EnrollmentRequest.EnrollmentRequestReadRepo;
			const item = request('roundtrip');
			await uow.withTransaction(undefined, async (repo) => {
				await repo.save(item);
			});
			expect(await read.getById(item.id)).toEqual(item.toSnapshot());
			expect(await read.getById('unknown')).toBeNull();
			for (const status of ['approved', 'cancelled'] as const) {
				await uow.withTransaction(undefined, async (repo) => {
					const loaded = await repo.get(item.id);
					loaded.changeStatus({ status, changedBy: 'reviewer' }, now);
					await repo.save(loaded);
				});
			}
			expect((await read.getById(item.id))?.statusHistory).toHaveLength(3);
			await uow.withTransaction(undefined, async (repo) => {
				await repo.save(request('other', 'other@example.org', 'course-002'));
			});
			for (const filter of [{ status: 'cancelled' }, { courseId: 'course-001' }, { learnerEmail: 'learner@example.org' }, { status: 'cancelled', courseId: 'course-001', learnerEmail: 'learner@example.org' }] as const) {
				expect((await read.list(filter)).map((value) => value.id)).toEqual(['roundtrip']);
			}
			expect(await read.list({ courseId: 'missing' })).toEqual([]);
			expect(await read.list({ courseId: 'course-001', status: 'pending' })).toEqual([]);
			for (const status of ['pending', 'approved', 'rejected', 'cancelled'] as const) {
				const sample = request(`filter-${status}`, `${status}@example.org`, 'course-003');
				if (status !== 'pending') {
					sample.changeStatus({ status, changedBy: 'reviewer', reason: 'Review decision' }, now);
				}
				await uow.withTransaction(undefined, async (repo) => {
					await repo.save(sample);
				});
				const results = await read.list({ status, courseId: 'course-003' });
				expect(results).toHaveLength(1);
				expect(results[0]?.status).toBe(status);
			}
		});
	});
	Scenario('Active uniqueness and concurrent changes are enforced', ({ Then }) => {
		Then('concurrent creates and stale updates cannot violate enrollment invariants', async () => {
			const data = await sources();
			const uow = data.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork;
			const read = data.readonlyDataSource.Training.EnrollmentRequest.EnrollmentRequestReadRepo;
			const outcomes = await Promise.allSettled(
				['race1', 'race2'].map((id) =>
					uow.withTransaction(undefined, async (repo) => {
						await repo.save(request(id, 'race@example.org'));
					}),
				),
			);
			expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
			expect(outcomes.find((outcome) => outcome.status === 'rejected')).toMatchObject({ reason: { code: 'DUPLICATE_ACTIVE_REQUEST' } });
			const winner = (await read.list({ learnerEmail: 'race@example.org' }))[0];
			expect(winner).toBeDefined();
			if (winner === undefined) {
				throw new Error('Missing winner');
			}
			await uow.withTransaction(undefined, async (repo) => {
				const item = await repo.get(winner.id);
				item.changeStatus({ status: 'approved', changedBy: 'reviewer' }, now);
				await repo.save(item);
			});
			await expect(
				uow.withTransaction(undefined, async (repo) => {
					await repo.save(request('duplicate-approved', 'RACE@example.org'));
				}),
			).rejects.toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });
			await uow.withTransaction(undefined, async (repo) => {
				const item = await repo.get(winner.id);
				item.changeStatus({ status: 'cancelled', changedBy: 'reviewer' }, now);
				await repo.save(item);
			});
			await uow.withTransaction(undefined, async (repo) => {
				await repo.save(request('replacement', 'race@example.org'));
			});
			let release: () => void = () => {
				throw new Error('No waiter');
			};
			const gate = new Promise<void>((resolve) => {
				release = resolve;
			});
			let loaded: () => void = () => {
				throw new Error('No loader');
			};
			const ready = new Promise<void>((resolve) => {
				loaded = resolve;
			});
			const stale = uow.withTransaction(undefined, async (repo) => {
				const item = await repo.get('replacement');
				loaded();
				await gate;
				item.changeStatus({ status: 'rejected', changedBy: 'reviewer', reason: 'Prerequisites missing' }, now);
				await repo.save(item);
			});
			await ready;
			await uow.withTransaction(undefined, async (repo) => {
				const item = await repo.get('replacement');
				item.changeStatus({ status: 'approved', changedBy: 'reviewer' }, now);
				await repo.save(item);
			});
			release();
			await expect(stale).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
			expect((await read.getById('replacement'))?.statusHistory).toHaveLength(2);
		});
	});
	Scenario('Failed operations do not commit', ({ Then }) => {
		Then('a callback failure leaves storage unchanged', async () => {
			const data = await sources();
			const uow = data.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork;
			await expect(
				uow.withTransaction(undefined, async (repo) => {
					await repo.save(request('rollback', 'rollback@example.org'));
					throw new Error('Abort');
				}),
			).rejects.toThrow('Abort');
			expect(await data.readonlyDataSource.Training.EnrollmentRequest.EnrollmentRequestReadRepo.getById('rollback')).toBeNull();
			await uow.withTransaction(undefined, () => Promise.resolve());
			await expect(
				uow.withTransaction(undefined, async (repo) => {
					await repo.save(request('multi-1', 'multi1@example.org'));
					await repo.save(request('multi-2', 'multi2@example.org'));
				}),
			).rejects.toThrow('saves one enrollment request');
			expect(await data.readonlyDataSource.Training.EnrollmentRequest.EnrollmentRequestReadRepo.getById('multi-1')).toBeNull();
			await uow.withTransaction(undefined, async (repo) => {
				await repo.save(request('single', 'single@example.org'));
			});
			await expect(
				uow.withTransaction(undefined, async (repo) => {
					await repo.get('single');
					await repo.save(request('mismatched', 'mismatch@example.org'));
				}),
			).rejects.toThrow('saves its loaded aggregate');

			await expect(
				uow.withTransaction(undefined, async (repo) => {
					await repo.get('missing');
				}),
			).rejects.toMatchObject({ code: 'ENROLLMENT_REQUEST_NOT_FOUND' });
		});
	});
});
