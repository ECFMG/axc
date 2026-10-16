import type { DataSources } from '@axc/persistence';
import { EnrollmentRequest as EnrollmentRequestApi, type EnrollmentRequestApplicationService } from './enrollment-request/index.ts';

export interface EnrollmentContextApplicationService {
	EnrollmentRequest: EnrollmentRequestApplicationService;
}

export const Enrollment = (dataSources: DataSources): EnrollmentContextApplicationService => {
	return {
		EnrollmentRequest: EnrollmentRequestApi(dataSources),
	};
};
