import type { DataSources } from '@axc/persistence';

export interface CourseQueryCommand {
	q?: string;
	modality?: 'online' | 'in-person' | 'hybrid';
	status?: 'draft' | 'active' | 'retired';
	tag?: string;
	page: number;
	pageSize: number;
	sort: 'title' | 'createdAt' | 'updatedAt';
}

export const query = (dataSources: DataSources) => {
	// biome-ignore format: Cellix matches async (command: CourseQueryCommand): Promise< on one line
	return async (command: CourseQueryCommand): Promise<{
		items: Array<{
			id: string;
			title: string;
			summary: string;
			modality: string;
			status: string;
			tags: string[];
			createdAt: string;
			updatedAt: string;
		}>;
		page: number;
		pageSize: number;
		totalItems: number;
		totalPages: number;
	}> => {
		const found = await dataSources.readonlyDataSource.Course.Course.CourseReadRepo.search({
			...(command.q === undefined ? {} : { q: command.q }),
			...(command.modality === undefined ? {} : { modality: command.modality }),
			...(command.status === undefined ? {} : { status: command.status }),
			...(command.tag === undefined ? {} : { tag: command.tag }),
			page: command.page,
			pageSize: command.pageSize,
			sort: command.sort,
		});
		const totalPages = found.totalItems === 0 ? 0 : Math.ceil(found.totalItems / command.pageSize);
		return {
			items: found.items.map((item) => ({
				id: item.id,
				title: item.title,
				summary: item.summary,
				modality: item.modality,
				status: item.status,
				tags: [...item.tags],
				createdAt: item.createdAt.toISOString(),
				updatedAt: item.updatedAt.toISOString(),
			})),
			page: command.page,
			pageSize: command.pageSize,
			totalItems: found.totalItems,
			totalPages,
		};
	};
};
