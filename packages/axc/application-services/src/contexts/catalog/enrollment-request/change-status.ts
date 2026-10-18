import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const changeStatus = (sources: DataSources) => async (id: string, input: Domain.Contexts.Catalog.ChangeStatus) => {
	Domain.Contexts.Catalog.validateChange(input);
	let result: Domain.Contexts.Catalog.EnrollmentProps | undefined;
	await sources.domainDataSource.Catalog.EnrollmentRequest.withScopedTransaction(async (repo) => {
		const entity = await repo.getById(id);
		entity.changeStatus(input);
		await repo.save(entity);
		result = structuredClone(entity.props);
	});
	if (!result) throw new Error('Transaction did not update a request.');
	return result;
};
