import type { DataSources } from '@axc/persistence';

export type CourseModality = 'online' | 'in-person' | 'hybrid';
export type CourseStatus = 'draft' | 'active' | 'retired';
export type CourseSortField = 'title' | 'createdAt' | 'updatedAt';

export interface CourseQueryCommand {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSortField;
}

export interface CourseView {
	id: string;
	title: string;
	summary: string;
	modality: CourseModality;
	status: CourseStatus;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

export interface CoursePage {
	items: CourseView[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export const queryCourses = (dataSources: DataSources) => {
	return async (command: CourseQueryCommand): Promise<CoursePage> => {
		const { items, totalItems } = await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.search(command);
		return {
			items: items.map((course) => ({ ...course, createdAt: course.createdAt.toISOString(), updatedAt: course.updatedAt.toISOString() })),
			page: command.page,
			pageSize: command.pageSize,
			totalItems,
			totalPages: Math.ceil(totalItems / command.pageSize),
		};
	};
};
