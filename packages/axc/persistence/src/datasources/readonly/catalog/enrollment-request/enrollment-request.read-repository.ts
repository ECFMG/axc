import type { Domain } from '@axc/domain';

type Props = Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestProps;
type Filters = Domain.Contexts.Catalog.EnrollmentRequest.RequestFilters;
export interface EnrollmentRequestReadRepository {
	getById(id: string): Promise<Props | undefined>;
	list(filters: Filters): Promise<Props[]>;
}
export function EnrollmentRequestReadRepo(store: Map<string, Props>): EnrollmentRequestReadRepository {
	return {
		getById: (id) => Promise.resolve(structuredClone(store.get(id))),
		list: (filters) =>
			Promise.resolve(
				structuredClone(
					[...store.values()].filter(
						(r) => (!filters.status || r.status === filters.status) && (!filters.courseId || r.courseId === filters.courseId) && (!filters.learnerEmail || r.learnerEmail === filters.learnerEmail.toLowerCase()),
					),
				),
			),
	};
}
