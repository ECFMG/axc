import type { EnrollmentRequest } from '@axc/domain';

export interface EnrollmentRequestRepository {
	list(): EnrollmentRequest[];
	getById(id: string): EnrollmentRequest | undefined;
	save(request: EnrollmentRequest): void;
}

export function createInMemoryEnrollmentRequestRepository(initial: readonly EnrollmentRequest[] = []): EnrollmentRequestRepository {
	const records = initial.map(cloneEnrollmentRequest);

	return {
		list(): EnrollmentRequest[] {
			return records.map(cloneEnrollmentRequest);
		},
		getById(id: string): EnrollmentRequest | undefined {
			const found = records.find((record) => record.id === id);
			return found === undefined ? undefined : cloneEnrollmentRequest(found);
		},
		save(request: EnrollmentRequest): void {
			const copy = cloneEnrollmentRequest(request);
			const index = records.findIndex((record) => record.id === copy.id);
			if (index === -1) {
				records.push(copy);
				return;
			}

			records[index] = copy;
		},
	};
}

function cloneEnrollmentRequest(request: EnrollmentRequest): EnrollmentRequest {
	return {
		...request,
		statusHistory: request.statusHistory.map((entry) => ({ ...entry })),
	};
}
