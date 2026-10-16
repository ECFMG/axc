import type { EnrollmentRequestProps } from '@axc/domain';
import { TrainingContext } from './training/index.ts';
export const DomainDataSourceImplementation = (records: Map<string, EnrollmentRequestProps>) => ({ Training: TrainingContext(records) });
export type DomainDataSource = ReturnType<typeof DomainDataSourceImplementation>;
