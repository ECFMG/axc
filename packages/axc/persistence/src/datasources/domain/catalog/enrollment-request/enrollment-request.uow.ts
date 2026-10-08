import type { Catalog } from '@axc/domain';

export function createEnrollmentRequestUnitOfWork(requests: Map<string, Catalog.EnrollmentRequest.EnrollmentRequest>): Catalog.EnrollmentRequest.EnrollmentRequestUnitOfWork {
	let tail: Promise<unknown> = Promise.resolve();
	return {
		withScopedTransaction<T>(work: (repository: Catalog.EnrollmentRequest.EnrollmentRequestRepository) => Promise<T>): Promise<T> {
			const run = async () => {
				const staged = new Map(requests);
				const repository: Catalog.EnrollmentRequest.EnrollmentRequestRepository = {
					getById(id) {
						const value = staged.get(id);
						return Promise.resolve(value ? structuredClone(value) : null);
					},
					findActive(courseId, learnerEmail) {
						const value = [...staged.values()].find(
							(request) => request.courseId === courseId && request.learnerEmail.toLowerCase() === learnerEmail.toLowerCase() && (request.status === 'pending' || request.status === 'approved'),
						);
						return Promise.resolve(value ? structuredClone(value) : null);
					},
					save(request) {
						staged.set(request.id, structuredClone(request));
						return Promise.resolve(structuredClone(request));
					},
				};
				const result = await work(repository);
				requests.clear();
				for (const [id, value] of staged) requests.set(id, value);
				return result;
			};
			const result = tail.then(run, run);
			tail = result.then(
				() => undefined,
				() => undefined,
			);
			return result;
		},
	};
}
