import type { DataSources } from '@axc/persistence';
import { queryCourses } from './query-courses.ts';
export const Course = (dataSources: DataSources): { queryCourses: ReturnType<typeof queryCourses> } => ({ queryCourses: queryCourses(dataSources) });
