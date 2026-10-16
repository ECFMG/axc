import type { EnrollmentRequest, EnrollmentRequestProps, EnrollmentRequestUnitOfWork } from '@axc/domain';
import { cloneEnrollmentRequest } from './enrollment-request.domain-adapter.ts';
import { EnrollmentRequestRepository } from './enrollment-request.repository.ts';

export class InMemoryEnrollmentRequestUnitOfWork implements EnrollmentRequestUnitOfWork {
	private tail: Promise<void> = Promise.resolve();
	private readonly records: Map<string, EnrollmentRequestProps>;
	constructor(records: Map<string, EnrollmentRequestProps>) {
		this.records = records;
	}
	async withTransaction(_passport: null, func: (repository: EnrollmentRequestRepository) => Promise<void>): Promise<void> {
		const previous = this.tail;
		let release!: () => void;
		this.tail = new Promise<void>((resolve) => {
			release = resolve;
		});
		await previous;
		try {
			const working = new Map([...this.records].map(([id, props]) => [id, cloneEnrollmentRequest(props)]));
			await func(new EnrollmentRequestRepository(working));
			this.records.clear();
			for (const [id, props] of working) this.records.set(id, cloneEnrollmentRequest(props));
		} finally {
			release();
		}
	}
	withScopedTransaction(func: (repository: EnrollmentRequestRepository) => Promise<void>): Promise<void> {
		return this.withTransaction(null, func);
	}
	async withScopedTransactionById(id: string, func: (repository: EnrollmentRequestRepository) => Promise<void>): Promise<EnrollmentRequest> {
		let result: EnrollmentRequest | null = null;
		await this.withScopedTransaction(async (repository) => {
			await func(repository);
			result = await repository.getById(id);
		});
		if (!result) throw new Error(`Enrollment request ${id} not found`);
		return result;
	}
}
