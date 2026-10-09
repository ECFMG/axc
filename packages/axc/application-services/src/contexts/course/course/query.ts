import type { DataSources } from '@axc/persistence';

export interface CourseQueryCommand {
	q?: string;
	modality?: string;
	status?: string;
	tag?: string;
	page: number;
	pageSize: number;
	sort: 'title' | 'createdAt' | 'updatedAt';
}

export const query = (dataSources: DataSources) => {
	return async (command: CourseQueryCommand): Promise<Awaited<ReturnType<DataSources['readonlyDataSource']['Course']['Course']['CourseReadRepo']['query']>>> => {
		return await dataSources.readonlyDataSource.Course.Course.CourseReadRepo.query(command);
	};
};
