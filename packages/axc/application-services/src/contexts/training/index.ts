import type { DataSources } from '@axc/persistence';
import { Course, type CourseApplicationService } from './course/index.ts';
import { EnrollmentRequest, type EnrollmentRequestApplicationService } from './enrollment-request/index.ts';
export interface TrainingApplicationService {
	Course: CourseApplicationService;
	EnrollmentRequest: EnrollmentRequestApplicationService;
}
export const Training = (dataSources: DataSources): TrainingApplicationService => ({ Course: Course(dataSources), EnrollmentRequest: EnrollmentRequest(dataSources) });
