import { activeEnrollmentStatuses, type EnrollmentRequest, type EnrollmentStatus } from '@axc/domain';

export interface EnrollmentRequestFilters {
	status?: EnrollmentStatus | undefined;
	courseId?: string | undefined;
	learnerEmail?: string | undefined;
}

export interface EnrollmentRequestRepository {
	save(request: EnrollmentRequest): Promise<EnrollmentRequest>;
	getById(id: string): Promise<EnrollmentRequest | undefined>;
	list(filters: EnrollmentRequestFilters): Promise<EnrollmentRequest[]>;
	findActive(courseId: string, learnerEmail: string): Promise<EnrollmentRequest | undefined>;
}

/** Process-lifetime store. The sample app has no real database. */
export class InMemoryEnrollmentRequestRepository implements EnrollmentRequestRepository {
	readonly #requests = new Map<string, EnrollmentRequest>();

	save(request: EnrollmentRequest): Promise<EnrollmentRequest> {
		this.#requests.set(request.id, request);
		return Promise.resolve(request);
	}

	getById(id: string): Promise<EnrollmentRequest | undefined> {
		return Promise.resolve(this.#requests.get(id));
	}

	list(filters: EnrollmentRequestFilters): Promise<EnrollmentRequest[]> {
		const matched = [...this.#requests.values()].filter(
			(request) =>
				(filters.status === undefined || request.status === filters.status) &&
				(filters.courseId === undefined || request.courseId === filters.courseId) &&
				(filters.learnerEmail === undefined || request.learnerEmail.toLowerCase() === filters.learnerEmail.toLowerCase()),
		);
		return Promise.resolve(matched.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
	}

	findActive(courseId: string, learnerEmail: string): Promise<EnrollmentRequest | undefined> {
		return Promise.resolve([...this.#requests.values()].find((request) => request.courseId === courseId && request.learnerEmail.toLowerCase() === learnerEmail.toLowerCase() && activeEnrollmentStatuses.includes(request.status)));
	}
}
