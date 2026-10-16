import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const queryCourses = (dataSources: DataSources) => {
	return (criteria: Domain.Contexts.Training.Course.CourseSearchCriteria) => dataSources.readonlyDataSource.Training.Course.CourseReadRepo.search(criteria);
};
