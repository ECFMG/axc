import type { DataSources } from '@axc/persistence';
import type { EnrollmentResult } from './contracts.ts';
import { create, type EnrollmentCreateCommand } from './create.ts';
import { type EnrollmentGetByIdQuery, getById } from './get-by-id.ts';
import { type EnrollmentListQuery, list } from './list.ts';
import { type EnrollmentUpdateStatusCommand, updateStatus } from './update-status.ts';
export interface EnrollmentRequestApplicationService {
	create(command: EnrollmentCreateCommand): Promise<EnrollmentResult>;
	getById(query: EnrollmentGetByIdQuery): Promise<EnrollmentResult>;
	list(query: EnrollmentListQuery): Promise<EnrollmentResult[]>;
	updateStatus(command: EnrollmentUpdateStatusCommand): Promise<EnrollmentResult>;
}
export const EnrollmentRequest = (dataSources: DataSources): EnrollmentRequestApplicationService => ({
	create: create(dataSources),
	getById: getById(dataSources),
	list: list(dataSources),
	updateStatus: updateStatus(dataSources),
});
export type { EnrollmentResult } from './contracts.ts';
export type { EnrollmentCreateCommand } from './create.ts';
export type { EnrollmentGetByIdQuery } from './get-by-id.ts';
export type { EnrollmentListQuery } from './list.ts';
export type { EnrollmentUpdateStatusCommand } from './update-status.ts';
