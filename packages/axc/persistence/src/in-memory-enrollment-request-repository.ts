import type { EnrollmentRequest, EnrollmentRequestRepository } from '@axc/domain';

const ID_PREFIX = 'enroll-';
const ID_MIN_DIGITS = 3;

const formatId = (sequence: number): string => `${ID_PREFIX}${String(sequence).padStart(ID_MIN_DIGITS, '0')}`;

const copyRequest = (request: EnrollmentRequest): EnrollmentRequest => ({
	...request,
	statusHistory: request.statusHistory.map((entry) => ({ ...entry })),
});

/** Enrollment request repository backed by an in-memory store, seeded with the given requests. */
export class InMemoryEnrollmentRequestRepository implements EnrollmentRequestRepository {
	readonly #requests = new Map<string, EnrollmentRequest>();
	#sequence = 0;

	constructor(initial: readonly EnrollmentRequest[] = []) {
		for (const request of initial) {
			this.#requests.set(request.id, copyRequest(request));
		}
	}

	/** Issues ids from a monotonic sequence, so an id is never issued twice, and skips ids already stored. */
	nextId(): Promise<string> {
		let id: string;
		do {
			this.#sequence += 1;
			id = formatId(this.#sequence);
		} while (this.#requests.has(id));
		return Promise.resolve(id);
	}

	getById(id: string): Promise<EnrollmentRequest | undefined> {
		const found = this.#requests.get(id);
		return Promise.resolve(found === undefined ? undefined : copyRequest(found));
	}

	getAll(): Promise<readonly EnrollmentRequest[]> {
		return Promise.resolve([...this.#requests.values()].map(copyRequest));
	}

	save(request: EnrollmentRequest): Promise<void> {
		this.#requests.set(request.id, copyRequest(request));
		return Promise.resolve();
	}
}
