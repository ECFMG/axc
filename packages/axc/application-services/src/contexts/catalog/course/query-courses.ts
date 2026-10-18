import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const queryCourses = (dataSources: DataSources) => async (query: Domain.Contexts.Catalog.Course.CourseSearchQuery) => {
	const problems = Domain.Contexts.Catalog.Course.validateCourseSearchQuery(query);
	if (problems.length) throw new RangeError(problems.map((problem) => problem.message).join(' '));
	return await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.search(query);
};
