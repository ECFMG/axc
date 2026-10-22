import type { DataSources } from '@axc/persistence';
import { Course as CourseApi, type CourseApplicationService } from './course/index.ts';
import { EnrollmentRequest as EnrollmentRequestApi, type EnrollmentRequestApplicationService } from './enrollment-request/index.ts';
export interface CatalogContextApplicationService {
	Course: CourseApplicationService;
	EnrollmentRequest: EnrollmentRequestApplicationService;
}
export const Catalog = (sources: DataSources): CatalogContextApplicationService => ({ Course: CourseApi(sources), EnrollmentRequest: EnrollmentRequestApi(sources) });
