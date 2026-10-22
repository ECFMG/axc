import type { DataSources } from '@axc/persistence';
import { ApplicationFailure } from '../errors.ts';
import type { EnrollmentResult } from './contracts.ts';
export interface EnrollmentListQuery {
	status?: string;
	courseId?: string;
	learnerEmail?: string;
}
export const list =
	(dataSources: DataSources) =>
	async (query: EnrollmentListQuery): Promise<EnrollmentResult[]> => {
		const details: { field: string; message: string }[] = [];
		if (query.status !== undefined && !['pending', 'approved', 'rejected', 'cancelled'].includes(query.status)) details.push({ field: 'status', message: 'Invalid status.' });
		if (query.learnerEmail !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query.learnerEmail)) details.push({ field: 'learnerEmail', message: 'Invalid learnerEmail.' });
		if (details.length) throw new ApplicationFailure('INVALID_REQUEST', 'The request could not be completed.', details);
		return await dataSources.readonlyDataSource.Training.EnrollmentRequest.EnrollmentRequestReadRepo.list(query);
	};
