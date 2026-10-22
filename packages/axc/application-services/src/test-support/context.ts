import type { EnrollmentRequest } from '@axc/domain';
import { type ApiContext, type ApplicationServices, buildApplicationServicesFactory, type Clock } from '../index.ts';

const defaultClock: Clock = () => new Date('2026-06-27T10:00:00.000Z');

/** Complete ApiContext for unit tests. Pass a partial override to replace the empty catalog, clock, or environment. */
export function createTestApiContext(override?: Partial<ApiContext>): ApiContext {
	return {
		environment: override?.environment ?? 'test',
		catalog: override?.catalog ?? emptyCatalog(),
		clock: override?.clock ?? defaultClock,
	};
}

export function createTestServices(override?: Partial<ApiContext>): Promise<ApplicationServices> {
	return buildApplicationServicesFactory(createTestApiContext(override)).forRequest();
}

function emptyCatalog(): ApiContext['catalog'] {
	return {
		listCourses() {
			return [];
		},
		findCourseById(_id: string) {
			return undefined;
		},
		listEnrollmentRequests() {
			return [];
		},
		findEnrollmentRequestById(_id: string) {
			return undefined;
		},
		addEnrollmentRequest(_request: EnrollmentRequest) {
			return undefined;
		},
		replaceEnrollmentRequest(_request: EnrollmentRequest) {
			return undefined;
		},
		allocateEnrollmentId() {
			return 'enroll-000';
		},
	};
}
