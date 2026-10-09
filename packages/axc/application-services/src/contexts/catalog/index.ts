import type { DataSources } from '@axc/persistence';
import { Course as CourseApi, type CourseApplicationService } from './course/index.ts';
import { EnrollmentRequest as EnrollmentRequestApi, type EnrollmentRequestApplicationService } from './enrollment-request/index.ts';

export type { CourseSearchQuery, CourseSearchResult } from './course/index.ts';
export type { CreateEnrollmentRequestCommand, EnrollmentRequestQuery, UpdateEnrollmentStatusCommand } from './enrollment-request/index.ts';
export { CatalogError, CatalogValidationError } from './errors.ts';
export interface CatalogContextApplicationService {
	Course: CourseApplicationService;
	EnrollmentRequest: EnrollmentRequestApplicationService;
}
export const Catalog = (dataSources: DataSources): CatalogContextApplicationService => ({
	Course: CourseApi(dataSources),
	EnrollmentRequest: EnrollmentRequestApi(dataSources),
});
