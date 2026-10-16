import type { EnrollmentRequestProps } from '@axc/domain';
import { CourseReadRepositoryImpl } from './course/index.ts';
import { EnrollmentRequestReadRepositoryImpl } from './enrollment-request/index.ts';
export const TrainingContext = (records: Map<string, EnrollmentRequestProps>) => ({ Course: CourseReadRepositoryImpl(), EnrollmentRequest: EnrollmentRequestReadRepositoryImpl(records) });
