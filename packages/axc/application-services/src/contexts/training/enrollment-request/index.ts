import type { DataSources } from '@axc/persistence';
import { create } from './create.ts';
import { queryById } from './query-by-id.ts';
import { queryRequests } from './query-requests.ts';
import { updateStatus } from './update-status.ts';
export interface EnrollmentRequestApplicationService {
	create: ReturnType<typeof create>;
	queryById: ReturnType<typeof queryById>;
	queryRequests: ReturnType<typeof queryRequests>;
	updateStatus: ReturnType<typeof updateStatus>;
}
export const EnrollmentRequest = (dataSources: DataSources): EnrollmentRequestApplicationService => ({
	create: create(dataSources),
	queryById: queryById(dataSources),
	queryRequests: queryRequests(dataSources),
	updateStatus: updateStatus(dataSources),
});
