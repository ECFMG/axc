export type CourseModality = 'online' | 'in-person' | 'hybrid';
export type CourseStatus = 'draft' | 'active' | 'retired';
export interface Course {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly modality: CourseModality;
	readonly status: CourseStatus;
	readonly tags: readonly string[];
	readonly createdAt: string;
	readonly updatedAt: string;
}
export interface CourseSearchQuery {
	readonly q?: string;
	readonly modality?: CourseModality;
	readonly status?: CourseStatus;
	readonly tag?: string;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: 'title' | 'createdAt' | 'updatedAt';
}
export interface CourseSearchResult {
	readonly items: Course[];
	readonly page: number;
	readonly pageSize: number;
	readonly totalItems: number;
	readonly totalPages: number;
}
interface CourseReadRepository {
	search(query: CourseSearchQuery): Promise<CourseSearchResult>;
	getById(id: string): Promise<Course | null>;
}
export class InMemoryCourseReadRepository implements CourseReadRepository {
	private readonly courses: readonly Course[];
	constructor(courses: readonly Course[]) {
		this.courses = courses;
	}
	async getById(id: string): Promise<Course | null> {
		return await Promise.resolve(this.courses.find((course) => course.id === id) ?? null);
	}
	async search(query: CourseSearchQuery): Promise<CourseSearchResult> {
		const keyword = query.q?.toLowerCase();
		const matches = this.courses.filter(
			(course) =>
				(!keyword || [course.title, course.summary, ...course.tags].some((text) => text.toLowerCase().includes(keyword))) &&
				(!query.modality || course.modality === query.modality) &&
				(!query.status || course.status === query.status) &&
				(!query.tag || course.tags.some((tag) => tag.toLowerCase() === query.tag?.toLowerCase())),
		);
		matches.sort((a, b) => a[query.sort].localeCompare(b[query.sort]) || a.id.localeCompare(b.id));
		return await Promise.resolve({
			items: matches.slice((query.page - 1) * query.pageSize, query.page * query.pageSize).map((course) => ({ ...course, tags: [...course.tags] })),
			page: query.page,
			pageSize: query.pageSize,
			totalItems: matches.length,
			totalPages: Math.ceil(matches.length / query.pageSize),
		});
	}
}
