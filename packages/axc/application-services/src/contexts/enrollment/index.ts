import type { DataSources } from '@axc/persistence';
import { EnrollmentRequest, type EnrollmentRequestApplicationService } from './enrollment-request/index.ts';

export type {
	EnrollmentRequestCreateCommand,
	EnrollmentRequestError,
	EnrollmentRequestPage,
	EnrollmentRequestQueryCommand,
	EnrollmentRequestResult,
	EnrollmentRequestStatus,
	EnrollmentRequestStatusUpdateCommand,
	EnrollmentRequestView,
} from './enrollment-request/index.ts';

export interface EnrollmentContextApplicationService {
	EnrollmentRequest: EnrollmentRequestApplicationService;
}

export const Enrollment = (dataSources: DataSources): EnrollmentContextApplicationService => ({
	EnrollmentRequest: EnrollmentRequest(dataSources),
});
