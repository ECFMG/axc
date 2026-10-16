import type { DataSources } from '@axc/persistence';
import { create } from './create.ts';
import { get } from './get.ts';
import { query } from './query.ts';
import { updateStatus } from './update-status.ts';

export interface EnrollmentRequestApplicationService {
	create: ReturnType<typeof create>;
	get: ReturnType<typeof get>;
	query: ReturnType<typeof query>;
	updateStatus: ReturnType<typeof updateStatus>;
}

export const EnrollmentRequest = (dataSources: DataSources): EnrollmentRequestApplicationService => {
	return {
		create: create(dataSources),
		get: get(dataSources),
		query: query(dataSources),
		updateStatus: updateStatus(dataSources),
	};
};
