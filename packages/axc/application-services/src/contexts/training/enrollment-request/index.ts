import type { DataSources } from '@axc/persistence';
import { changeStatus } from './change-status.ts';
import { create } from './create.ts';
import { queryById } from './query-by-id.ts';
import { queryRequests } from './query-requests.ts';

interface EnrollmentRequestServices {
	create: ReturnType<typeof create>;
	queryById: ReturnType<typeof queryById>;
	queryRequests: ReturnType<typeof queryRequests>;
	changeStatus: ReturnType<typeof changeStatus>;
}
export const EnrollmentRequest = (dataSources: DataSources): EnrollmentRequestServices => ({
	create: create(dataSources),
	queryById: queryById(dataSources),
	queryRequests: queryRequests(dataSources),
	changeStatus: changeStatus(dataSources),
});
