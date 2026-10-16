import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const search = (dataSources: DataSources) => async (criteria: Domain.Contexts.Training.Course.CourseSearchCriteria) => {
	return await dataSources.readonlyDataSource.Training.Course.search(criteria);
};
