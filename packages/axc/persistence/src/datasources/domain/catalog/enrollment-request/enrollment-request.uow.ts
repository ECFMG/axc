import { Domain } from '@axc/domain';
import { NotFoundError } from '@cellix/domain-seedwork/repository';

const { EnrollmentRequest, WorkflowError } = Domain.Contexts.Catalog;
type Props = Domain.Contexts.Catalog.EnrollmentProps;
type Repo = Domain.Contexts.Catalog.EnrollmentRepository;
export function enrollmentStore() {
	let records = new Map<string, Props>();
	let queue = Promise.resolve();
	const transact = async (work: (repo: Repo) => Promise<void>): Promise<void> => {
		const previous = queue;
		let release = () => {
			/* Assigned by the Promise executor before use. */
		};
		queue = new Promise<void>((resolve) => {
			release = resolve;
		});
		await previous;
		const staged = new Map([...records].map(([id, p]) => [id, structuredClone(p)]));
		const get = (id: string) => {
			const p = staged.get(id);
			if (!p) throw new NotFoundError('Enrollment request not found.');
			return Promise.resolve(new EnrollmentRequest(structuredClone(p), {}));
		};
		const repo: Repo = {
			get,
			getById: get,
			getNewInstance(input) {
				return Promise.resolve(EnrollmentRequest.getNewInstance(crypto.randomUUID(), input, {}));
			},
			hasActive(courseId, email) {
				return Promise.resolve([...staged.values()].some((p) => p.courseId === courseId && p.learnerEmail === email.toLowerCase() && ['pending', 'approved'].includes(p.status)));
			},
			save(entity) {
				const p = entity.props;
				if (
					['pending', 'approved'].includes(p.status) &&
					[...staged.values()].some((other) => other.id !== p.id && other.courseId === p.courseId && other.learnerEmail === p.learnerEmail && ['pending', 'approved'].includes(other.status))
				)
					throw new WorkflowError('DUPLICATE_ACTIVE_REQUEST', 'An active request already exists.');
				staged.set(p.id, structuredClone(p));
				return Promise.resolve(entity);
			},
		};
		try {
			await work(repo);
			records = staged;
		} finally {
			release();
		}
	};
	const uow: Domain.Contexts.Catalog.EnrollmentUnitOfWork = {
		withScopedTransaction: transact,
		withTransaction: (_passport, work) => transact(work),
		async withScopedTransactionById(id, work) {
			let result: InstanceType<typeof EnrollmentRequest> | undefined;
			await transact(async (repo) => {
				await work(repo);
				result = await repo.get(id);
			});
			if (!result) throw new NotFoundError('Enrollment request not found.');
			return result;
		},
	};
	return {
		uow,
		reader: {
			getById(id: string) {
				return Promise.resolve(structuredClone(records.get(id)));
			},
			list(filter: Domain.Contexts.Catalog.EnrollmentFilter) {
				return Promise.resolve(
					structuredClone(
						[...records.values()].filter(
							(p) => (!filter.status || p.status === filter.status) && (!filter.courseId || p.courseId === filter.courseId) && (!filter.learnerEmail || p.learnerEmail === filter.learnerEmail.toLowerCase()),
						),
					),
				);
			},
		},
	};
}
