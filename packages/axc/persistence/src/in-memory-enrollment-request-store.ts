import type { EnrollmentRequest, EnrollmentRequestStore, StatusHistoryEntry } from '@axc/domain';

/** Fresh in-memory enrollment request store. Each application factory owns one store. */
export function createEnrollmentRequestStore(): EnrollmentRequestStore {
	const requests: EnrollmentRequest[] = [];
	let sequence = 0;

	return {
		list(): readonly EnrollmentRequest[] {
			return requests.map((request) => copyRequest(request));
		},
		findById(id: string): EnrollmentRequest | undefined {
			const found = requests.find((request) => request.id === id);
			return found === undefined ? undefined : copyRequest(found);
		},
		nextId(): string {
			sequence += 1;
			return `enroll-${String(sequence).padStart(3, '0')}`;
		},
		insert(request: EnrollmentRequest): EnrollmentRequest {
			const copy = copyRequest(request);
			requests.push(copy);
			return copyRequest(copy);
		},
		update(request: EnrollmentRequest): EnrollmentRequest {
			const index = requests.findIndex((item) => item.id === request.id);
			if (index < 0) {
				throw new Error(`Enrollment request ${request.id} does not exist.`);
			}
			const copy = copyRequest(request);
			requests[index] = copy;
			return copyRequest(copy);
		},
	};
}

function copyRequest(request: EnrollmentRequest): EnrollmentRequest {
	return {
		id: request.id,
		courseId: request.courseId,
		learnerEmail: request.learnerEmail,
		justification: request.justification,
		status: request.status,
		createdAt: request.createdAt,
		updatedAt: request.updatedAt,
		statusHistory: request.statusHistory.map((entry) => copyHistoryEntry(entry)),
	};
}

function copyHistoryEntry(entry: StatusHistoryEntry): StatusHistoryEntry {
	return {
		fromStatus: entry.fromStatus,
		toStatus: entry.toStatus,
		changedAt: entry.changedAt,
		changedBy: entry.changedBy,
		reason: entry.reason,
	};
}
