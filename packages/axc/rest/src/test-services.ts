import type { ApplicationServices, ApplicationServicesFactory } from '@axc/application-services';
import { Domain } from '@axc/domain';
import { vi } from 'vitest';
export function fakeServices(): ApplicationServices {
	return {
		health: { getStatus: vi.fn() },
		Training: {
			Course: { queryCourses: vi.fn() },
			EnrollmentRequest: { create: vi.fn(), queryById: vi.fn(), queryRequests: vi.fn(), changeStatus: vi.fn() },
		},
	};
}
export function fakeFactory(services: ApplicationServices): ApplicationServicesFactory {
	return { forRequest: vi.fn(() => Promise.resolve(services)) };
}
export const enrollmentSnapshot = Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequest.create(
	'id',
	{ courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'I need this course for work.' },
	{ status: 'active' },
	'2026-06-27T10:00:00.000Z',
).toSnapshot();
