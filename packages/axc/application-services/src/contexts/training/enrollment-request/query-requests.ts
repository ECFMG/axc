import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const queryRequests = (dataSources: DataSources) => async (command: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestFilter) => dataSources.readonlyDataSource.Training.EnrollmentRequest.list(command);
