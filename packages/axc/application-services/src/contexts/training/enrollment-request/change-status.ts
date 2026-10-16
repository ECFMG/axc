import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const changeStatus = (dataSources: DataSources) => {
	return async (id: string, input: Domain.Contexts.Training.EnrollmentRequest.ChangeEnrollmentStatusInput) => {
		let result: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestProps | undefined;
		await dataSources.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withTransaction(undefined, async (repo) => {
			const item = await repo.get(id);
			item.changeStatus(input, new Date().toISOString());
			await repo.save(item);
			result = item.toSnapshot();
		});
		if (result === undefined) {
			throw new Error('Enrollment status change did not produce a result');
		}
		return result;
	};
};
