import { Catalog } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { createStore } from '../../../store.ts';
import { EnrollmentRequestConverter } from './enrollment-request.domain-adapter.ts';
import { EnrollmentRequestRepository } from './enrollment-request.repository.ts';

describe('EnrollmentRequestRepository', () => {
	it('creates, saves, and retrieves via converter', async () => {
		const repo = new EnrollmentRequestRepository(createStore(), new EnrollmentRequestConverter());
		const created = await repo.getNewInstance('course-001', new Catalog.EnrollmentRequest.LearnerEmail('a@example.org'), new Catalog.EnrollmentRequest.Justification('A sufficiently long reason.'), '2026-01-01T00:00:00.000Z');
		await repo.save(created);
		const found = await repo.getById(created.id);
		expect(found?.toReference()).toEqual(created.toReference());
		expect((await repo.findActive('course-001', 'a@example.org'))?.id).toBe(created.id);
	});
});
