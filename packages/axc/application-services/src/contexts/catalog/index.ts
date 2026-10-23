import type { DataSources } from '@axc/persistence';
import { Course as CourseApi, type CourseApplicationService } from './course/index.ts';
import { EnrollmentRequest as EnrollmentRequestApi, type EnrollmentRequestApplicationService } from './enrollment-request/index.ts';

export type { CourseApplicationService, CourseSearchQuery, CourseSearchResult, QueryParameterErrorDetail } from './course/index.ts';
export { InvalidQueryParameterError } from './course/index.ts';
export type {
	CreateEnrollmentRequestCommand,
	EnrollmentRequestApplicationService,
	EnrollmentRequestListResult,
	GetEnrollmentRequestQuery,
	QueryEnrollmentRequestsQuery,
	UpdateEnrollmentRequestStatusCommand,
} from './enrollment-request/index.ts';

export interface CatalogContextApplicationService {
	Course: CourseApplicationService;
	EnrollmentRequest: EnrollmentRequestApplicationService;
}

export const Catalog = (dataSources: DataSources): CatalogContextApplicationService => {
	return {
		Course: CourseApi(dataSources),
		EnrollmentRequest: EnrollmentRequestApi(dataSources),
	};
};
