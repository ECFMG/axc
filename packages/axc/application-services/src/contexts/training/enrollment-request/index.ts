import type { EnrollmentRequestEntityReference } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { changeStatus, type EnrollmentRequestStatusCommand } from './change-status.ts';
import { create, type EnrollmentRequestCreateCommand } from './create.ts';
import { getById, list } from './query.ts';
export interface EnrollmentRequestApplicationService {
	create(command: EnrollmentRequestCreateCommand): Promise<EnrollmentRequestEntityReference>;
	getById(id: string): Promise<EnrollmentRequestEntityReference>;
	list(filter?: Record<string, unknown>): Promise<EnrollmentRequestEntityReference[]>;
	changeStatus(command: EnrollmentRequestStatusCommand): Promise<EnrollmentRequestEntityReference>;
}
export const EnrollmentRequest = (dataSources: DataSources): EnrollmentRequestApplicationService => ({
	create: create(dataSources),
	getById: getById(dataSources),
	list: list(dataSources),
	changeStatus: changeStatus(dataSources),
});
