import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const queryCourses = (dataSources: DataSources) => async (command: Domain.Contexts.Training.Course.CourseSearch) => dataSources.readonlyDataSource.Training.Course.search(command);
