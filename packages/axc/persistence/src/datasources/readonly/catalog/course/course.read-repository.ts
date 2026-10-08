import type { Domain } from '@axc/domain';

type Course = Domain.Contexts.Catalog.Course.Course;
type CourseModality = Domain.Contexts.Catalog.Course.CourseModality;
type CourseSortField = Domain.Contexts.Catalog.Course.CourseSortField;
type CourseStatus = Domain.Contexts.Catalog.Course.CourseStatus;

export interface CourseSearchCriteria {
	q: string | undefined;
	modality: CourseModality | undefined;
	status: CourseStatus | undefined;
	tag: string | undefined;
	page: number;
	pageSize: number;
	sort: CourseSortField;
}

export interface CourseSearchPage {
	items: Course[];
	totalItems: number;
}

export interface CourseReadRepository {
	search: (criteria: CourseSearchCriteria) => Promise<CourseSearchPage>;
}

function includesKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLowerCase();
	return course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle) || course.tags.some((tag) => tag.toLowerCase().includes(needle));
}

function hasTag(course: Course, tag: string): boolean {
	const needle = tag.toLowerCase();
	return course.tags.some((value) => value.toLowerCase() === needle);
}

function compareCourses(left: Course, right: Course, sort: CourseSortField): number {
	if (sort === 'title') {
		const byTitle = left.title.localeCompare(right.title);
		if (byTitle !== 0) {
			return byTitle;
		}
		return left.id.localeCompare(right.id);
	}

	const byField = left[sort].localeCompare(right[sort]);
	if (byField !== 0) {
		return byField;
	}
	return left.id.localeCompare(right.id);
}

class CourseReadRepositoryImpl implements CourseReadRepository {
	private readonly courses: readonly Course[];

	public constructor(courses: readonly Course[]) {
		this.courses = courses;
	}

	public search(criteria: CourseSearchCriteria): Promise<CourseSearchPage> {
		const matched = this.courses.filter((course) => {
			if (criteria.q !== undefined && criteria.q !== '' && !includesKeyword(course, criteria.q)) {
				return false;
			}
			if (criteria.modality !== undefined && course.modality !== criteria.modality) {
				return false;
			}
			if (criteria.status !== undefined && course.status !== criteria.status) {
				return false;
			}
			if (criteria.tag !== undefined && criteria.tag !== '' && !hasTag(course, criteria.tag)) {
				return false;
			}
			return true;
		});

		const sorted = [...matched].sort((left, right) => compareCourses(left, right, criteria.sort));
		const start = (criteria.page - 1) * criteria.pageSize;

		return Promise.resolve({
			items: sorted.slice(start, start + criteria.pageSize),
			totalItems: sorted.length,
		});
	}
}

export const getCourseReadRepository = (courses: readonly Course[]): CourseReadRepository => {
	return new CourseReadRepositoryImpl(courses);
};
