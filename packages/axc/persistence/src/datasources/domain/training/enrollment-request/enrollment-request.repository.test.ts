import { Training } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { createStore } from '../../../store.ts';
import { EnrollmentRequestConverter } from './enrollment-request.domain-adapter.ts';
import { EnrollmentRequestRepository } from './enrollment-request.repository.ts';

describe('EnrollmentRequestRepository', () => {
	it('creates through factory, saves through converter, and retrieves a separate aggregate', async () => {
		const store = createStore();
		const repo = new EnrollmentRequestRepository(store, new EnrollmentRequestConverter());
		const created = await repo.getNewInstance('course-001', new Training.EnrollmentRequest.LearnerEmail('A@Example.org'), new Training.EnrollmentRequest.Justification('x'.repeat(20)), 't1');
		await repo.save(created);
		const fetched = await repo.getById(created.id);
		expect(fetched?.statusHistory).toEqual(created.statusHistory);
		expect(fetched).not.toBe(created);
		expect(await repo.hasActive('course-001', 'a@example.org')).toBe(true);
	});
});
