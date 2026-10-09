import type { EnrollmentRequest } from '@axc/domain';
import { cloneRequest, type Store } from '../../../store.ts';
export interface EnrollmentRequestReadRepository {
	getById(id: string): Promise<EnrollmentRequest | null>;
	getAll(): Promise<EnrollmentRequest[]>;
}
export const getEnrollmentRequestReadRepository = (store: Store): EnrollmentRequestReadRepository => ({
	getById: (id) => {
		const request = store.requests.get(id);
		return Promise.resolve(request ? cloneRequest(request) : null);
	},
	getAll: () => Promise.resolve([...store.requests.values()].map(cloneRequest)),
});
