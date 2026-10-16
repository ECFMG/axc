import type { DataSources } from '@axc/persistence';
import { vi } from 'vitest';
export function fakeDataSources(): DataSources {
	return {
		readonlyDataSource: {
			Training: {
				Course: { CourseReadRepo: { search: vi.fn(), getById: vi.fn() } },
				EnrollmentRequest: { EnrollmentRequestReadRepo: { getById: vi.fn(), list: vi.fn() } },
			},
		},
		domainDataSource: { Training: { EnrollmentRequest: { EnrollmentRequestUnitOfWork: { withTransaction: vi.fn() } } } },
	};
}
