import type { EnrollmentRequest } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { InMemoryEnrollmentRequestRepository } from './in-memory-enrollment-request-repository.ts';

const makeRequest = (id: string, overrides: Partial<EnrollmentRequest> = {}): EnrollmentRequest => ({
	id,
	courseId: 'course-001',
	learnerEmail: `${id}@example.org`,
	justification: 'I need this course to prepare for upcoming secure development work.',
	status: 'pending',
	createdAt: '2026-06-27T10:00:00.000Z',
	updatedAt: '2026-06-27T10:00:00.000Z',
	statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: '2026-06-27T10:00:00.000Z', changedBy: 'system', reason: null }],
	...overrides,
});

const nextIds = async (repository: InMemoryEnrollmentRequestRepository, count: number): Promise<string[]> => {
	const ids: string[] = [];
	for (let index = 0; index < count; index += 1) {
		const id = await repository.nextId();
		ids.push(id);
		await repository.save(makeRequest(id));
	}
	return ids;
};

describe('InMemoryEnrollmentRequestRepository', () => {
	describe('nextId', () => {
		it('starts at enroll-001 for an empty repository', async () => {
			const repository = new InMemoryEnrollmentRequestRepository();

			await expect(repository.nextId()).resolves.toBe('enroll-001');
		});

		it('issues zero-padded ids in sequence', async () => {
			const repository = new InMemoryEnrollmentRequestRepository();

			expect(await nextIds(repository, 3)).toEqual(['enroll-001', 'enroll-002', 'enroll-003']);
		});

		it('never issues the same id twice, even before the previous id is saved', async () => {
			const repository = new InMemoryEnrollmentRequestRepository();

			const first = await repository.nextId();
			const second = await repository.nextId();

			expect(first).toBe('enroll-001');
			expect(second).toBe('enroll-002');
		});

		it('skips ids already used by the initial requests', async () => {
			const repository = new InMemoryEnrollmentRequestRepository([makeRequest('enroll-001'), makeRequest('enroll-002')]);

			await expect(repository.nextId()).resolves.toBe('enroll-003');
		});

		it('skips a seeded id in the middle of the sequence', async () => {
			const repository = new InMemoryEnrollmentRequestRepository([makeRequest('enroll-002')]);

			expect(await nextIds(repository, 2)).toEqual(['enroll-001', 'enroll-003']);
		});

		it('keeps at least three digits and grows past 999', async () => {
			const seeded = Array.from({ length: 999 }, (_, index) => makeRequest(`enroll-${String(index + 1).padStart(3, '0')}`));
			const repository = new InMemoryEnrollmentRequestRepository(seeded);

			await expect(repository.nextId()).resolves.toBe('enroll-1000');
		});
	});

	describe('save and getById', () => {
		it('returns undefined for an unknown id', async () => {
			const repository = new InMemoryEnrollmentRequestRepository([makeRequest('enroll-001')]);

			await expect(repository.getById('enroll-404')).resolves.toBeUndefined();
		});

		it('returns a request given at construction', async () => {
			const seeded = makeRequest('enroll-001');
			const repository = new InMemoryEnrollmentRequestRepository([seeded]);

			await expect(repository.getById('enroll-001')).resolves.toEqual(seeded);
		});

		it('inserts a new request', async () => {
			const repository = new InMemoryEnrollmentRequestRepository();
			const request = makeRequest('enroll-001');

			await repository.save(request);

			await expect(repository.getById('enroll-001')).resolves.toEqual(request);
		});

		it('replaces the stored request with the same id', async () => {
			const original = makeRequest('enroll-001');
			const repository = new InMemoryEnrollmentRequestRepository([original]);
			const updated = makeRequest('enroll-001', {
				status: 'approved',
				updatedAt: '2026-06-28T09:00:00.000Z',
				statusHistory: [...original.statusHistory, { fromStatus: 'pending', toStatus: 'approved', changedAt: '2026-06-28T09:00:00.000Z', changedBy: 'reviewer@example.org', reason: null }],
			});

			await repository.save(updated);

			await expect(repository.getById('enroll-001')).resolves.toEqual(updated);
			await expect(repository.getAll()).resolves.toEqual([updated]);
		});
	});

	describe('getAll', () => {
		it('returns an empty list for an empty repository', async () => {
			const repository = new InMemoryEnrollmentRequestRepository();

			await expect(repository.getAll()).resolves.toEqual([]);
		});

		it('returns both the initial requests and the saved requests', async () => {
			const a = makeRequest('enroll-001');
			const b = makeRequest('enroll-002');
			const repository = new InMemoryEnrollmentRequestRepository([a, b]);
			const c = makeRequest('enroll-003');

			await repository.save(c);

			const all = await repository.getAll();
			expect([...all].sort((x, y) => x.id.localeCompare(y.id))).toEqual([a, b, c]);
		});
	});

	describe('defensive copies', () => {
		it('is not affected by later mutation of the initial array', async () => {
			const initial = [makeRequest('enroll-001')];
			const repository = new InMemoryEnrollmentRequestRepository(initial);

			initial.push(makeRequest('enroll-002'));

			expect((await repository.getAll()).map((request) => request.id)).toEqual(['enroll-001']);
		});

		it('is not affected by mutating a saved object afterwards', async () => {
			const repository = new InMemoryEnrollmentRequestRepository();
			const request = makeRequest('enroll-001');
			await repository.save(request);

			(request as { status: string }).status = 'approved';
			(request.statusHistory as unknown[]).push({ fromStatus: 'pending', toStatus: 'approved', changedAt: 'x', changedBy: 'x', reason: null });

			const stored = await repository.getById('enroll-001');
			expect(stored?.status).toBe('pending');
			expect(stored?.statusHistory).toHaveLength(1);
		});

		it('is not affected by mutating an object returned by getById', async () => {
			const repository = new InMemoryEnrollmentRequestRepository([makeRequest('enroll-001')]);
			const returned = await repository.getById('enroll-001');
			if (returned === undefined) {
				throw new Error('expected a request');
			}

			(returned as { status: string }).status = 'cancelled';
			(returned.statusHistory as unknown[]).length = 0;

			const again = await repository.getById('enroll-001');
			expect(again?.status).toBe('pending');
			expect(again?.statusHistory).toHaveLength(1);
		});

		it('is not affected by mutating the list or items returned by getAll', async () => {
			const repository = new InMemoryEnrollmentRequestRepository([makeRequest('enroll-001')]);
			const all = (await repository.getAll()) as EnrollmentRequest[];

			(all[0] as { status: string }).status = 'rejected';
			(all[0]?.statusHistory as unknown[]).length = 0;
			all.push(makeRequest('enroll-002'));

			const again = await repository.getAll();
			expect(again).toHaveLength(1);
			expect(again[0]?.status).toBe('pending');
			expect(again[0]?.statusHistory).toHaveLength(1);
		});
	});
});
