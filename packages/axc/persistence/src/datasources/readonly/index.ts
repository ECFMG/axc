import type { EnrollmentRequestProps } from '@axc/domain';
import { TrainingContext } from './training/index.ts';

export type { Course, CourseSearchQuery, CourseSearchResult } from './training/course/index.ts';
export type { EnrollmentRequestFilter } from './training/enrollment-request/index.ts';
export const ReadonlyDataSourceImplementation = (records: Map<string, EnrollmentRequestProps>) => ({ Training: TrainingContext(records) });
export type ReadonlyDataSource = ReturnType<typeof ReadonlyDataSourceImplementation>;
