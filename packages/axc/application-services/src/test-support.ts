import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { type Mocked, vi } from 'vitest';

type Props = Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestProps;
interface TestSources {
	dataSources: DataSources;
	repository: Mocked<Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestRepository<Props>>;
	unitOfWork: Mocked<Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork<Props>>;
	request: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestAggregate<Props>;
}
export const sampleInput = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'x'.repeat(20) };
export const sampleCourse: Domain.Contexts.Training.Course.Course = {
	id: 'course-001',
	title: 'Security',
	summary: 'Training',
	modality: 'online',
	status: 'active',
	tags: ['ai'],
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
};
export const testSources = (): TestSources => {
	const request = Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestAggregate.getNewInstance(
		{ id: 'request-001', ...sampleInput, status: 'pending', createdAt: new Date(), updatedAt: new Date(), statusHistory: [] },
		sampleInput,
		{ now: () => new Date('2026-01-01T00:00:00Z') },
	);
	const repository = {
		get: vi.fn(async () => request),
		save: vi.fn(async () => request),
		getNewInstance: vi.fn(async () => request),
		queryById: vi.fn(async () => request as typeof request | undefined),
		hasActiveRequest: vi.fn(async () => false),
	};
	const unitOfWork = { withScopedTransaction: vi.fn(async (callback: (repo: typeof repository) => Promise<void>) => callback(repository)), withTransaction: vi.fn(), withScopedTransactionById: vi.fn() };
	const dataSources: DataSources = {
		readonlyDataSource: {
			Training: {
				Course: { search: vi.fn(async () => ({ items: [sampleCourse], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 })), queryById: vi.fn(async () => sampleCourse) },
				EnrollmentRequest: { queryById: vi.fn(async () => request.toRecord()), list: vi.fn(async () => [request.toRecord()]) },
			},
		},
		domainDataSource: { Training: { EnrollmentRequest: { EnrollmentRequestUnitOfWork: unitOfWork } } },
	};
	return { dataSources, repository, unitOfWork, request };
};
