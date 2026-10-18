import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { changeStatus } from './change-status.ts';
import { create } from './create.ts';
import { getById } from './get-by-id.ts';
import { list } from './list.ts';
export interface EnrollmentRequestApplicationService {
	create(input: Domain.Contexts.Catalog.CreateEnrollment): Promise<Domain.Contexts.Catalog.EnrollmentProps>;
	changeStatus(id: string, input: Domain.Contexts.Catalog.ChangeStatus): Promise<Domain.Contexts.Catalog.EnrollmentProps>;
	getById(id: string): Promise<Domain.Contexts.Catalog.EnrollmentProps>;
	list(filter: Domain.Contexts.Catalog.EnrollmentFilter): Promise<Domain.Contexts.Catalog.EnrollmentProps[]>;
}
export const EnrollmentRequest = (sources: DataSources): EnrollmentRequestApplicationService => ({ create: create(sources), changeStatus: changeStatus(sources), getById: getById(sources), list: list(sources) });
