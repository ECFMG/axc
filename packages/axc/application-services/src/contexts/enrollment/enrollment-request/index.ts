import type { DataSources } from '@axc/persistence';
import { create, type EnrollmentRequestCreateCommand } from './create.ts';
import { type EnrollmentRequestGetByIdCommand, type EnrollmentRequestResult, getById } from './get-by-id.ts';
import { type EnrollmentRequestPage, type EnrollmentRequestQueryCommand, queryEnrollmentRequests } from './query-enrollment-requests.ts';
import { type EnrollmentRequestStatusUpdateCommand, update } from './update.ts';

export type { EnrollmentRequestCreateCommand } from './create.ts';
export type { EnrollmentRequestError, EnrollmentRequestResult, EnrollmentRequestStatus, EnrollmentRequestView } from './get-by-id.ts';
export type { EnrollmentRequestPage, EnrollmentRequestQueryCommand } from './query-enrollment-requests.ts';
export type { EnrollmentRequestStatusUpdateCommand } from './update.ts';

export interface EnrollmentRequestApplicationService {
	create(command: EnrollmentRequestCreateCommand): Promise<EnrollmentRequestResult>;
	getById(command: EnrollmentRequestGetByIdCommand): Promise<EnrollmentRequestResult>;
	queryEnrollmentRequests(command: EnrollmentRequestQueryCommand): Promise<EnrollmentRequestPage>;
	updateStatus(command: EnrollmentRequestStatusUpdateCommand): Promise<EnrollmentRequestResult>;
}

export const EnrollmentRequest = (dataSources: DataSources): EnrollmentRequestApplicationService => ({
	create: create(dataSources),
	getById: getById(dataSources),
	queryEnrollmentRequests: queryEnrollmentRequests(dataSources),
	updateStatus: update(dataSources),
});
