import { EnrollmentError, type EnrollmentRequest } from './enrollment-model.ts';

/** Process-local sample repository. Synchronous operations make check-and-insert atomic within one process. */
export class EnrollmentStore {
	private readonly requests = new Map<string, EnrollmentRequest>();
	get(id: string): EnrollmentRequest | undefined {
		const request = this.requests.get(id);
		return request ? structuredClone(request) : undefined;
	}
	list(): EnrollmentRequest[] {
		return [...this.requests.values()].map((request) => structuredClone(request));
	}
	insert(request: EnrollmentRequest): EnrollmentRequest {
		for (const existing of this.requests.values()) {
			if (existing.courseId === request.courseId && existing.learnerEmail === request.learnerEmail && (existing.status === 'pending' || existing.status === 'approved')) {
				throw new EnrollmentError('DUPLICATE_ACTIVE_REQUEST', 409, 'An active request already exists for this learner and course.');
			}
		}
		return this.save(request);
	}
	save(request: EnrollmentRequest): EnrollmentRequest {
		this.requests.set(request.id, structuredClone(request));
		return structuredClone(request);
	}
}
