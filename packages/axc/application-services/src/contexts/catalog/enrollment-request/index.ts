import type { Catalog } from '@axc/domain';
import type { DataSources, EnrollmentRequestFilters } from '@axc/persistence';
import { type CreateEnrollmentCommand, create } from './create.ts';
import { getById } from './get-by-id.ts';
import { list } from './list.ts';
import { type UpdateStatusCommand, updateStatus } from './update-status.ts';

export interface EnrollmentRequestApplicationService {
	create(command: CreateEnrollmentCommand): Promise<Catalog.EnrollmentRequest.EnrollmentRequest>;
	getById(id: string): Promise<Catalog.EnrollmentRequest.EnrollmentRequest | null>;
	list(filters: EnrollmentRequestFilters): Promise<Catalog.EnrollmentRequest.EnrollmentRequest[]>;
	updateStatus(command: UpdateStatusCommand): Promise<Catalog.EnrollmentRequest.EnrollmentRequest>;
}
export const EnrollmentRequest = (dataSources: DataSources): EnrollmentRequestApplicationService => ({
	create: create(dataSources),
	getById: getById(dataSources),
	list: list(dataSources),
	updateStatus: updateStatus(dataSources),
});
