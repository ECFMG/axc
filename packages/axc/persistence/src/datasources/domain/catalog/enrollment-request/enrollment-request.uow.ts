import { Domain } from '@axc/domain';
import { NotFoundError } from '@cellix/domain-seedwork/repository';

type Props = Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestProps;
type Repo = Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestRepository;
type Uow = Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestUnitOfWork;
const { EnrollmentRequest, WorkflowError } = Domain.Contexts.Catalog.EnrollmentRequest;
export function EnrollmentRequestUow(store: Map<string, Props>): Uow {
	let queue = Promise.resolve();
	const withScopedTransaction: Uow['withScopedTransaction'] = async (work) => {
		const previous = queue;
		let release = () => {
			/* Assigned by the promise executor before waiting. */
		};
		queue = new Promise<void>((resolve) => {
			release = resolve;
		});
		await previous;
		try {
			const staged = structuredClone(store);
			const get = (id: string) => {
				const props = staged.get(id);
				if (!props) throw new NotFoundError('Enrollment request not found.');
				return Promise.resolve(new EnrollmentRequest(structuredClone(props), {}));
			};
			const repository: Repo = {
				get,
				getById: get,
				getNewInstance: (input) => Promise.resolve(EnrollmentRequest.getNewInstance(crypto.randomUUID(), input, {})),
				save: (entity) => {
					const record = entity.props;
					if (
						['pending', 'approved'].includes(record.status) &&
						[...staged.values()].some((r) => r.id !== record.id && r.courseId === record.courseId && r.learnerEmail === record.learnerEmail && ['pending', 'approved'].includes(r.status))
					)
						throw new WorkflowError('DUPLICATE_ACTIVE_REQUEST', 'An active request already exists for this learner and course.');
					staged.set(entity.id, structuredClone(record));
					return Promise.resolve(entity);
				},
			};
			await work(repository);
			store.clear();
			for (const [id, record] of staged) store.set(id, record);
		} finally {
			release();
		}
	};
	return {
		withScopedTransaction,
		withTransaction: (_passport, work) => withScopedTransaction(work),
		withScopedTransactionById: async (id, work) => {
			let result: InstanceType<typeof EnrollmentRequest> | undefined;
			await withScopedTransaction(async (repo) => {
				await repo.getById(id);
				await work(repo);
				result = await repo.getById(id);
			});
			if (!result) throw new NotFoundError('Enrollment request not found.');
			return result;
		},
	};
}
