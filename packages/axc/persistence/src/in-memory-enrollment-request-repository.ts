import { EnrollmentRequest, type EnrollmentRequestFilter, type EnrollmentRequestProps, type EnrollmentRequestRepository } from '@axc/domain';
import { NotFoundError } from '@cellix/domain-seedwork/repository';

/** Stores plain props and rehydrates aggregates, so callers never share mutable state with the store. */
export class InMemoryEnrollmentRequestRepository implements EnrollmentRequestRepository {
	private readonly rows = new Map<string, EnrollmentRequestProps>();

	nextId(): string {
		return `enroll-${String(this.rows.size + 1).padStart(3, '0')}`;
	}

	async get(id: string): Promise<EnrollmentRequest> {
		const found = await this.getById(id);
		if (!found) throw new NotFoundError(`Enrollment request ${id} was not found.`);
		return found;
	}

	getById(id: string): Promise<EnrollmentRequest | undefined> {
		const row = this.rows.get(id);
		return Promise.resolve(row && rehydrate(row));
	}

	list(filter: EnrollmentRequestFilter): Promise<EnrollmentRequest[]> {
		const email = filter.learnerEmail?.toLowerCase();
		return Promise.resolve([...this.rows.values()].filter((r) => (!filter.status || r.status === filter.status) && (!filter.courseId || r.courseId === filter.courseId) && (!email || r.learnerEmail === email)).map(rehydrate));
	}

	save(item: EnrollmentRequest): Promise<EnrollmentRequest> {
		this.rows.set(item.id, structuredClone(item.props));
		return Promise.resolve(item);
	}
}

const rehydrate = (row: EnrollmentRequestProps): EnrollmentRequest => new EnrollmentRequest(structuredClone(row), undefined);
