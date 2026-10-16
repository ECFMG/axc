import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { type CreateEnrollmentRequestCommand, create } from './create.ts';
import { type GetEnrollmentRequestQuery, getEnrollmentRequest } from './get-enrollment-request.ts';
import { type EnrollmentRequestListResult, type QueryEnrollmentRequestsQuery, queryEnrollmentRequests } from './query-enrollment-requests.ts';
import { type UpdateEnrollmentRequestStatusCommand, update } from './update.ts';

type EnrollmentRequestSnapshot = Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestSnapshot;

export type { CreateEnrollmentRequestCommand } from './create.ts';
export type { GetEnrollmentRequestQuery } from './get-enrollment-request.ts';
export type { EnrollmentRequestListResult, QueryEnrollmentRequestsQuery } from './query-enrollment-requests.ts';
export type { UpdateEnrollmentRequestStatusCommand } from './update.ts';

export interface EnrollmentRequestApplicationService {
	create: (command: CreateEnrollmentRequestCommand) => Promise<EnrollmentRequestSnapshot>;
	getById: (query: GetEnrollmentRequestQuery) => Promise<EnrollmentRequestSnapshot>;
	list: (query: QueryEnrollmentRequestsQuery) => Promise<EnrollmentRequestListResult>;
	updateStatus: (command: UpdateEnrollmentRequestStatusCommand) => Promise<EnrollmentRequestSnapshot>;
}

export const EnrollmentRequest = (dataSources: DataSources): EnrollmentRequestApplicationService => {
	return {
		create: create(dataSources),
		getById: getEnrollmentRequest(dataSources),
		list: queryEnrollmentRequests(dataSources),
		updateStatus: update(dataSources),
	};
};
