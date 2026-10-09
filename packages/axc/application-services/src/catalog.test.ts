import { createDataSourcesFactory } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory, CatalogValidationError } from './index.ts';

const makeService = async () => (await buildApplicationServicesFactory({ environment: 'test', dataSourcesFactory: createDataSourcesFactory() }).forRequest()).Catalog.EnrollmentRequest;
const command = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'I need this course for secure development work.' };

describe('catalog application service invariants', () => {
	it('validates creation even when invoked without HTTP transport', async () => {
		const service = await makeService();
		await expect(service.create({ ...command, learnerEmail: 'bad' })).rejects.toBeInstanceOf(CatalogValidationError);
		await expect(service.create({ ...command, justification: 'short' })).rejects.toBeInstanceOf(CatalogValidationError);
		expect(await service.query({})).toEqual([]);
	});
	it('requires a rejection reason before any state or history change', async () => {
		const service = await makeService();
		const created = await service.create(command);
		await expect(service.updateStatus({ id: created.id, status: 'rejected', changedBy: 'reviewer' })).rejects.toBeInstanceOf(CatalogValidationError);
		expect(await service.queryById(created.id)).toMatchObject({ status: 'pending', statusHistory: [{ toStatus: 'pending' }] });
	});
});
