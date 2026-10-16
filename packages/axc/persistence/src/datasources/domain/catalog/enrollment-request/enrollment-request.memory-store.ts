import { Domain } from '@axc/domain';

type EnrollmentRequest = Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequest;
type EnrollmentRequestSnapshot = Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestSnapshot;

interface EnrollmentRequestWriteRepository {
	get: (id: string) => Promise<EnrollmentRequest>;
	save: (request: EnrollmentRequest) => Promise<EnrollmentRequestSnapshot>;
	findActiveByLearnerAndCourse: (learnerEmail: string, courseId: string) => Promise<EnrollmentRequestSnapshot | undefined>;
}

export interface EnrollmentRequestUnitOfWork {
	withScopedTransaction: (func: (repository: EnrollmentRequestWriteRepository) => Promise<void>) => Promise<void>;
}

function cloneSnapshot(snapshot: EnrollmentRequestSnapshot): EnrollmentRequestSnapshot {
	return structuredClone(snapshot);
}

const getEnrollmentRequestWriteRepository = (records: EnrollmentRequestSnapshot[]): EnrollmentRequestWriteRepository => {
	return {
		get: (id: string) => {
			const match = records.find((record) => record.id === id);
			if (match === undefined) {
				throw new Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestNotFoundError();
			}
			return Promise.resolve(Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequest.rehydrate(cloneSnapshot(match)));
		},
		save: (request: EnrollmentRequest) => {
			const snapshot = request.snapshot();
			const index = records.findIndex((record) => record.id === snapshot.id);
			if (index === -1) {
				records.push(cloneSnapshot(snapshot));
			} else {
				records[index] = cloneSnapshot(snapshot);
			}
			return Promise.resolve(cloneSnapshot(snapshot));
		},
		findActiveByLearnerAndCourse: (learnerEmail: string, courseId: string) => {
			const match = records.find(
				(record) =>
					record.courseId === courseId && Domain.Contexts.Catalog.EnrollmentRequest.sameLearnerEmail(record.learnerEmail, learnerEmail) && Domain.Contexts.Catalog.EnrollmentRequest.isActiveEnrollmentRequestStatus(record.status),
			);
			return Promise.resolve(match === undefined ? undefined : cloneSnapshot(match));
		},
	};
};

export const getEnrollmentRequestUnitOfWork = (records: EnrollmentRequestSnapshot[]): EnrollmentRequestUnitOfWork => {
	const repository = getEnrollmentRequestWriteRepository(records);
	return {
		withScopedTransaction: async (func) => {
			await func(repository);
		},
	};
};
