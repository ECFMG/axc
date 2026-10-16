import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { vi } from 'vitest';
export const enrollmentInput = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'I need this course for upcoming work.' };
export function trainingFixture() {
	let aggregate: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequest<Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestProps> | undefined;
	const course: Domain.Contexts.Training.Course.Course = {
		id: 'course-001',
		title: 'Course',
		summary: 'Summary',
		modality: 'online',
		status: 'active',
		tags: ['ai'],
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	};
	const record: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestRecord = { ...enrollmentInput, id: 'enroll-1', status: 'pending', createdAt: course.createdAt, updatedAt: course.updatedAt, statusHistory: [] };
	const repository: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestRepository = {
		get: vi.fn((id: string) => {
			if (aggregate === undefined || aggregate.props.record.id !== id) {
				return Promise.reject(new Error('Not found'));
			}
			return Promise.resolve(aggregate);
		}),
		save: vi.fn((item) => {
			aggregate = item;
			return Promise.resolve(item);
		}),
		getNewInstance: vi.fn((input, id, now) => Promise.resolve(Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequest.getNewInstance({ id, record }, input, id, now, undefined))),
		findById: vi.fn((id: string) => Promise.resolve(aggregate?.props.record.id === id ? aggregate : undefined)),
	};
	const withScopedTransaction = vi.fn(async (callback: (repository: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestRepository) => Promise<void>) => {
		await callback(repository);
	});
	const dataSources: DataSources = {
		readonlyDataSource: {
			Training: {
				Course: { getById: vi.fn(() => Promise.resolve(course)), search: vi.fn(() => Promise.resolve({ items: [course], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 })) },
				EnrollmentRequest: { getById: vi.fn(() => Promise.resolve(aggregate?.props.record)), list: vi.fn(() => Promise.resolve(aggregate === undefined ? [] : [aggregate.props.record])) },
			},
		},
		domainDataSource: {
			Training: {
				EnrollmentRequest: {
					EnrollmentRequestUnitOfWork: {
						withScopedTransaction,
						withTransaction: vi.fn(() => Promise.reject(new Error('Expected scoped transaction'))),
						withScopedTransactionById: vi.fn(() => Promise.reject(new Error('Expected explicit lookup'))),
					},
				},
			},
		},
	};
	return { dataSources, repository, withScopedTransaction, course };
}
