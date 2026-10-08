import type { Catalog } from '@axc/domain';

export interface EnrollmentRequestFilters {
	status?: Catalog.EnrollmentRequest.EnrollmentStatus;
	courseId?: string;
	learnerEmail?: string;
}
export interface EnrollmentRequestReadRepository {
	getById(id: string): Promise<Catalog.EnrollmentRequest.EnrollmentRequest | null>;
	list(filters: EnrollmentRequestFilters): Promise<Catalog.EnrollmentRequest.EnrollmentRequest[]>;
}
export function createEnrollmentRequestReadRepository(requests: Map<string, Catalog.EnrollmentRequest.EnrollmentRequest>): EnrollmentRequestReadRepository {
	return {
		getById(id) {
			const request = requests.get(id);
			return Promise.resolve(request ? structuredClone(request) : null);
		},
		list(filters) {
			return Promise.resolve(
				[...requests.values()]
					.filter(
						(request) =>
							(!filters.status || request.status === filters.status) &&
							(!filters.courseId || request.courseId === filters.courseId) &&
							(!filters.learnerEmail || request.learnerEmail.toLowerCase() === filters.learnerEmail.toLowerCase()),
					)
					.map((request) => structuredClone(request)),
			);
		},
	};
}
