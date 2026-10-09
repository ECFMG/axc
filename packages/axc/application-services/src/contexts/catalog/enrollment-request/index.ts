import type { EnrollmentRequest as EnrollmentRequestRecord } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { type CreateEnrollmentRequestCommand, create } from './create.ts';
import { type EnrollmentRequestQuery, query } from './query.ts';
import { queryById } from './query-by-id.ts';
import { type UpdateEnrollmentStatusCommand, updateStatus } from './update-status.ts';

export type { CreateEnrollmentRequestCommand, EnrollmentRequestQuery, UpdateEnrollmentStatusCommand };
export interface EnrollmentRequestApplicationService {
	create(command: CreateEnrollmentRequestCommand): Promise<EnrollmentRequestRecord>;
	queryById(id: string): Promise<EnrollmentRequestRecord>;
	query(filters: EnrollmentRequestQuery): Promise<EnrollmentRequestRecord[]>;
	updateStatus(command: UpdateEnrollmentStatusCommand): Promise<EnrollmentRequestRecord>;
}
export const EnrollmentRequest = (dataSources: DataSources): EnrollmentRequestApplicationService => ({
	create: create(dataSources),
	queryById: queryById(dataSources),
	query: query(dataSources),
	updateStatus: updateStatus(dataSources),
});
