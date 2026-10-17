import type { Catalog } from '@axc/domain';
import { EnrollmentRequestConverter } from '../../../domain/catalog/enrollment-request/enrollment-request.domain-adapter.ts';
import type { Store } from '../../../store.ts';

export interface EnrollmentRequestReadRepository {
	getById(id: string): Promise<Catalog.EnrollmentRequest.EnrollmentRequestEntityReference | null>;
	list(): Promise<readonly Catalog.EnrollmentRequest.EnrollmentRequestEntityReference[]>;
}
export const getEnrollmentRequestReadRepository = (store: Store): EnrollmentRequestReadRepository => {
	const converter = new EnrollmentRequestConverter();
	return {
		getById: (id) => {
			const record = store.requests.get(id);
			return Promise.resolve(record ? converter.toDomain(record).toReference() : null);
		},
		list: async () => [...store.requests.values()].map((record) => converter.toDomain(record).toReference()),
	};
};
