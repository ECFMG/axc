import type { EnrollmentRequest, EnrollmentRequestRepository, StatusHistoryEntry } from '@axc/domain';

/** Process-local enrollment requests. The catalog fixture stays read-only; this store is the write model. */
export function createEnrollmentRequestRepository(): EnrollmentRequestRepository {
	const requests: EnrollmentRequest[] = [];
	let sequence = 0;

	return {
		list(): readonly EnrollmentRequest[] {
			return requests.map(copyEnrollmentRequest);
		},
		findById(id: string): EnrollmentRequest | undefined {
			const found = requests.find((request) => request.id === id);
			return found === undefined ? undefined : copyEnrollmentRequest(found);
		},
		insert(request: EnrollmentRequest): void {
			requests.push(copyEnrollmentRequest(request));
		},
		replace(request: EnrollmentRequest): void {
			const index = requests.findIndex((candidate) => candidate.id === request.id);
			if (index === -1) {
				return;
			}
			requests[index] = copyEnrollmentRequest(request);
		},
		nextId(): string {
			sequence += 1;
			return `enroll-${String(sequence).padStart(3, '0')}`;
		},
	};
}

function copyEnrollmentRequest(request: EnrollmentRequest): EnrollmentRequest {
	return {
		id: request.id,
		courseId: request.courseId,
		learnerEmail: request.learnerEmail,
		justification: request.justification,
		status: request.status,
		createdAt: request.createdAt,
		updatedAt: request.updatedAt,
		statusHistory: request.statusHistory.map(copyStatusHistoryEntry),
	};
}

function copyStatusHistoryEntry(entry: StatusHistoryEntry): StatusHistoryEntry {
	return {
		fromStatus: entry.fromStatus,
		toStatus: entry.toStatus,
		changedAt: entry.changedAt,
		changedBy: entry.changedBy,
		reason: entry.reason,
	};
}
