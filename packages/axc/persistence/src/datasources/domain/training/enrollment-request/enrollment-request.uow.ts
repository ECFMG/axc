import type { Training } from '@axc/domain';
import type { Store } from '../../../store.ts';
import { EnrollmentRequestConverter } from './enrollment-request.domain-adapter.ts';
import { EnrollmentRequestRepository } from './enrollment-request.repository.ts';
export class EnrollmentRequestUnitOfWork implements Training.EnrollmentRequest.EnrollmentRequestUnitOfWork {
	private queue: Promise<void> = Promise.resolve();
	private readonly store: Store;
	constructor(store: Store) {
		this.store = store;
	}
	async withTransaction(_passport: undefined, operation: (repo: EnrollmentRequestRepository) => Promise<void>): Promise<void> {
		const previous = this.queue;
		let release!: () => void;
		this.queue = new Promise<void>((resolve) => {
			release = resolve;
		});
		await previous;
		try {
			const snapshot: Store = { courses: this.store.courses, requests: structuredClone(this.store.requests) };
			const converter = new EnrollmentRequestConverter();
			const repository = new EnrollmentRequestRepository(snapshot, converter);
			await operation(repository);
			this.store.requests = snapshot.requests;
		} finally {
			release();
		}
	}
	async withScopedTransaction(operation: (repo: EnrollmentRequestRepository) => Promise<void>) {
		await this.withTransaction(undefined, operation);
	}
	async withScopedTransactionById(id: string, operation: (repo: EnrollmentRequestRepository) => Promise<void>) {
		let result: Training.EnrollmentRequest.EnrollmentRequest | undefined;
		await this.withScopedTransaction(async (repo) => {
			await operation(repo);
			result = (await repo.getById(id)) ?? undefined;
		});
		if (!result) throw new Error('Enrollment request not found');
		return result;
	}
}
