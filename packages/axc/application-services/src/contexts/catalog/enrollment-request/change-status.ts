import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { getById } from './query-requests.ts';
export const changeStatus = (sources: DataSources) => async (id: string, input: Domain.Contexts.Catalog.EnrollmentRequest.StatusChange) => {
	const details = Domain.Contexts.Catalog.EnrollmentRequest.validateChange(input);
	if (details.length) throw new Domain.Contexts.Catalog.EnrollmentRequest.WorkflowError('INVALID_REQUEST', 'The request could not be completed.', details);
	await getById(sources)(id);
	let result: Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestProps | undefined;
	await sources.domainDataSource.Catalog.EnrollmentRequest.EnrollmentRequestUow.withScopedTransaction(async (repo) => {
		const entity = await repo.getById(id);
		entity.changeStatus(input);
		await repo.save(entity);
		result = structuredClone(entity.props);
	});
	if (!result) throw new Error('Transaction did not return a request.');
	return result;
};
