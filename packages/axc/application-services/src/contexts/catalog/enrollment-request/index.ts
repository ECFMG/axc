import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { changeStatus } from './change-status.ts';
import { create } from './create.ts';
import { getById, list } from './query-requests.ts';

type Model = Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestProps;
export interface EnrollmentRequestApplicationService {
	create(input: Domain.Contexts.Catalog.EnrollmentRequest.CreateRequest): Promise<Model>;
	getById(id: string): Promise<Model>;
	list(filters: Domain.Contexts.Catalog.EnrollmentRequest.RequestFilters): Promise<Model[]>;
	changeStatus(id: string, input: Domain.Contexts.Catalog.EnrollmentRequest.StatusChange): Promise<Model>;
}
export const EnrollmentRequest = (sources: DataSources): EnrollmentRequestApplicationService => ({ create: create(sources), getById: getById(sources), list: list(sources), changeStatus: changeStatus(sources) });
