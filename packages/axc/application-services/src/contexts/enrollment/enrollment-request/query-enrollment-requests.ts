import type { DataSources } from '@axc/persistence';
import { type EnrollmentRequestStatus, type EnrollmentRequestView, toEnrollmentRequestView } from './get-by-id.ts';

export interface EnrollmentRequestQueryCommand {
	status?: EnrollmentRequestStatus;
	courseId?: string;
	learnerEmail?: string;
	page: number;
	pageSize: number;
}

export interface EnrollmentRequestPage {
	items: EnrollmentRequestView[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export const queryEnrollmentRequests = (dataSources: DataSources) => {
	return async (command: EnrollmentRequestQueryCommand): Promise<EnrollmentRequestPage> => {
		const { items, totalItems } = await dataSources.readonlyDataSource.Enrollment.EnrollmentRequest.EnrollmentRequestReadRepo.search(command);
		return {
			items: items.map(toEnrollmentRequestView),
			page: command.page,
			pageSize: command.pageSize,
			totalItems,
			totalPages: Math.ceil(totalItems / command.pageSize),
		};
	};
};
