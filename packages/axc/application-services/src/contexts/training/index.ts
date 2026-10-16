import type { DataSources } from '@axc/persistence';
import { Course } from './course/index.ts';
import { EnrollmentRequest } from './enrollment-request/index.ts';

interface TrainingServices {
	Course: ReturnType<typeof Course>;
	EnrollmentRequest: ReturnType<typeof EnrollmentRequest>;
}
export const Training = (dataSources: DataSources): TrainingServices => ({ Course: Course(dataSources), EnrollmentRequest: EnrollmentRequest(dataSources) });
