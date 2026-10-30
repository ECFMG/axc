import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';

export interface CourseSearchCommand {
	q?: string;
	modality?: string;
	status?: string;
	tag?: string;
	page?: number;
	pageSize?: number;
	sort?: string;
}

export const search = (dataSources: DataSources) => {
	return async (command: CourseSearchCommand): Promise<Domain.Contexts.Catalog.Course.CourseEntityReference[]> => {
		return await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.search(command);
	};
};
