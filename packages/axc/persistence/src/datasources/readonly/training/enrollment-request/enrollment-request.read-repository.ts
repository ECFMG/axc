import type { Training } from '@axc/domain';
import type { Store } from '../../../store.ts';

interface EnrollmentRequestFilters {
	status?: string;
	courseId?: string;
	learnerEmail?: string;
}
interface EnrollmentRequestReadRepository {
	getById(id: string): Promise<Training.EnrollmentRequest.EnrollmentRequestEntityReference | null>;
	list(filters: EnrollmentRequestFilters): Promise<Training.EnrollmentRequest.EnrollmentRequestEntityReference[]>;
}
export class EnrollmentRequestReadRepositoryImpl implements EnrollmentRequestReadRepository {
	private readonly store: Store;
	constructor(store: Store) {
		this.store = store;
	}
	async getById(id: string) {
		return await Promise.resolve(structuredClone(this.store.requests.find((request) => request.id === id) ?? null));
	}
	async list(filters: EnrollmentRequestFilters) {
		return await Promise.resolve(
			structuredClone(
				this.store.requests.filter(
					(request) =>
						(!filters.status || request.status === filters.status) && (!filters.courseId || request.courseId === filters.courseId) && (!filters.learnerEmail || request.learnerEmail === filters.learnerEmail.toLowerCase()),
				),
			),
		);
	}
}
