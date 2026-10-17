import type { Catalog } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { type CreateEnrollmentRequestCommand, create } from './create.ts';
import { getById } from './get-by-id.ts';
import { type EnrollmentRequestListQuery, list } from './list.ts';
import { type UpdateStatusCommand, updateStatus } from './update-status.ts';

export type { CreateEnrollmentRequestCommand } from './create.ts';
export type { EnrollmentRequestListQuery } from './list.ts';
export type { UpdateStatusCommand } from './update-status.ts';
export interface EnrollmentRequestApplicationService {
	create(command: CreateEnrollmentRequestCommand): Promise<Catalog.EnrollmentRequest.EnrollmentRequestEntityReference>;
	getById(id: string): Promise<Catalog.EnrollmentRequest.EnrollmentRequestEntityReference>;
	list(query?: EnrollmentRequestListQuery): Promise<readonly Catalog.EnrollmentRequest.EnrollmentRequestEntityReference[]>;
	updateStatus(command: UpdateStatusCommand): Promise<Catalog.EnrollmentRequest.EnrollmentRequestEntityReference>;
}
export const EnrollmentRequest = (dataSources: DataSources): EnrollmentRequestApplicationService => ({
	create: create(dataSources),
	getById: getById(dataSources),
	list: list(dataSources),
	updateStatus: updateStatus(dataSources),
});
