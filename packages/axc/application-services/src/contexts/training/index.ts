import type { DataSources } from '@axc/persistence';
import { Course as CourseApi, type CourseApplicationService } from './course/index.ts';
import { EnrollmentRequest as EnrollmentRequestApi, type EnrollmentRequestApplicationService } from './enrollment-request/index.ts';
export interface TrainingContextApplicationService {
	Course: CourseApplicationService;
	EnrollmentRequest: EnrollmentRequestApplicationService;
}
export const Training = (dataSources: DataSources): TrainingContextApplicationService => ({ Course: CourseApi(dataSources), EnrollmentRequest: EnrollmentRequestApi(dataSources) });
