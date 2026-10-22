import type { Training } from '@axc/domain';
import type { Store } from '../../../store.ts';

interface CourseSearch {
	q?: string;
	modality?: string;
	status?: string;
	tag?: string;
	page: number;
	pageSize: number;
	sort: 'title' | 'createdAt' | 'updatedAt';
}
interface CoursePage {
	items: Training.Course.CourseEntityReference[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
interface CourseReadRepository {
	search(query: CourseSearch): Promise<CoursePage>;
	getById(id: string): Promise<Training.Course.CourseEntityReference | null>;
}
export class CourseReadRepositoryImpl implements CourseReadRepository {
	private readonly store: Store;
	constructor(store: Store) {
		this.store = store;
	}
	async getById(id: string) {
		return await Promise.resolve(structuredClone(this.store.courses.find((course) => course.id === id) ?? null));
	}
	async search(query: CourseSearch): Promise<CoursePage> {
		const text = query.q?.toLowerCase();
		const requestedTag = query.tag?.toLowerCase();
		const matching = this.store.courses
			.filter(
				(course) =>
					(!text || [course.title, course.summary, ...course.tags].some((value) => value.toLowerCase().includes(text))) &&
					(!query.modality || course.modality === query.modality) &&
					(!query.status || course.status === query.status) &&
					(!requestedTag || course.tags.some((tag) => tag.toLowerCase() === requestedTag)),
			)
			.sort((a, b) => a[query.sort].localeCompare(b[query.sort]) || a.id.localeCompare(b.id));
		return await Promise.resolve({
			items: structuredClone(matching.slice((query.page - 1) * query.pageSize, query.page * query.pageSize)),
			page: query.page,
			pageSize: query.pageSize,
			totalItems: matching.length,
			totalPages: Math.ceil(matching.length / query.pageSize),
		});
	}
}
