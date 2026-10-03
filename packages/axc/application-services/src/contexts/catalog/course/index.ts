import type { DataSources } from '@axc/persistence';
import { type CourseListQuery, type CourseListResult, list } from './list.ts';

export type { CourseListQuery, CourseListResult };

export const Course = (dataSources: DataSources) => ({ list: list(dataSources) });
