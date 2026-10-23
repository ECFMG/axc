import { Domain } from '@axc/domain';

type EnrollmentRequestSnapshot = Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestSnapshot;
type EnrollmentRequestStatus = Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestStatus;

interface EnrollmentRequestListCriteria {
	status: EnrollmentRequestStatus | undefined;
	courseId: string | undefined;
	learnerEmail: string | undefined;
}

export interface EnrollmentRequestReadRepository {
	getById: (id: string) => Promise<EnrollmentRequestSnapshot | undefined>;
	list: (criteria: EnrollmentRequestListCriteria) => Promise<EnrollmentRequestSnapshot[]>;
}

export const getEnrollmentRequestReadRepository = (records: EnrollmentRequestSnapshot[]): EnrollmentRequestReadRepository => {
	return {
		getById: (id: string) => {
			const match = records.find((record) => record.id === id);
			return Promise.resolve(match === undefined ? undefined : structuredClone(match));
		},
		list: (criteria: EnrollmentRequestListCriteria) => {
			const items = records.filter((record) => {
				if (criteria.status !== undefined && record.status !== criteria.status) {
					return false;
				}
				if (criteria.courseId !== undefined && criteria.courseId !== '' && record.courseId !== criteria.courseId) {
					return false;
				}
				if (criteria.learnerEmail !== undefined && criteria.learnerEmail !== '' && !Domain.Contexts.Catalog.EnrollmentRequest.sameLearnerEmail(record.learnerEmail, criteria.learnerEmail)) {
					return false;
				}
				return true;
			});
			return Promise.resolve(items.map((item) => structuredClone(item)));
		},
	};
};
