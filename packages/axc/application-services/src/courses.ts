export const courseModalities = ['online', 'in-person', 'hybrid'] as const;
export type CourseModality = (typeof courseModalities)[number];
export const isCourseModality = (value: unknown): value is CourseModality => (courseModalities as readonly unknown[]).includes(value);

export const courseStatuses = ['draft', 'active', 'retired'] as const;
export type CourseStatus = (typeof courseStatuses)[number];
export const isCourseStatus = (value: unknown): value is CourseStatus => (courseStatuses as readonly unknown[]).includes(value);

export const courseSorts = ['title', 'createdAt', 'updatedAt'] as const;
export type CourseSort = (typeof courseSorts)[number];
export const isCourseSort = (value: unknown): value is CourseSort => (courseSorts as readonly unknown[]).includes(value);

export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: CourseModality;
	status: CourseStatus;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

export interface CourseQuery {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSort;
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

const contains = (value: string, term: string): boolean => value.toLowerCase().includes(term.toLowerCase());

const matchesCourse = (course: Course, query: CourseQuery): boolean => {
	if (query.modality !== undefined && course.modality !== query.modality) return false;
	if (query.status !== undefined && course.status !== query.status) return false;
	const tag = query.tag;
	if (tag !== undefined && !course.tags.some((item) => item.toLowerCase() === tag.toLowerCase())) return false;
	const term = query.q;
	if (term !== undefined && !contains(course.title, term) && !contains(course.summary, term) && !course.tags.some((item) => contains(item, term))) return false;
	return true;
};

const compareCourses = (left: Course, right: Course, sort: CourseSort): number => {
	const byField = left[sort].localeCompare(right[sort]);
	return byField === 0 ? left.id.localeCompare(right.id) : byField;
};

export const courses: readonly Course[] = [
	{
		id: 'course-001',
		title: 'AI Security Foundations',
		summary: 'Introductory course on secure AI-assisted development.',
		modality: 'online',
		status: 'active',
		tags: ['AI', 'Security'],
		createdAt: '2026-01-15T00:00:00.000Z',
		updatedAt: '2026-06-01T00:00:00.000Z',
	},
	{
		id: 'course-002',
		title: 'Security Operations',
		summary: 'Runbooks for on-call analysts.',
		modality: 'online',
		status: 'active',
		tags: ['operations'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-02-02T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Incident Drills',
		summary: 'Tabletop SECURITY exercises for teams.',
		modality: 'in-person',
		status: 'draft',
		tags: ['drills'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-03-02T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Platform Hygiene',
		summary: 'Baseline hardening practices.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['Security'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-02T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Model Evaluation Lab',
		summary: 'Measure model quality in production.',
		modality: 'online',
		status: 'draft',
		tags: ['AI', 'evaluation'],
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-05-02T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'TypeScript Essentials',
		summary: 'Practical types for application code.',
		modality: 'online',
		status: 'active',
		tags: ['javascript'],
		createdAt: '2026-01-20T00:00:00.000Z',
		updatedAt: '2026-07-01T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Classroom Facilitation',
		summary: 'Lead an in-person training room.',
		modality: 'in-person',
		status: 'active',
		tags: ['teaching'],
		createdAt: '2026-06-15T00:00:00.000Z',
		updatedAt: '2026-06-16T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Blended Leadership',
		summary: 'Hybrid program for new managers.',
		modality: 'hybrid',
		status: 'active',
		tags: ['leadership'],
		createdAt: '2026-02-20T00:00:00.000Z',
		updatedAt: '2026-08-01T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Legacy Stylesheets',
		summary: 'Maintain older css codebases.',
		modality: 'online',
		status: 'retired',
		tags: ['css'],
		createdAt: '2026-07-01T00:00:00.000Z',
		updatedAt: '2026-07-02T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Whiteboard Sketching',
		summary: 'Draw systems with markers.',
		modality: 'in-person',
		status: 'retired',
		tags: ['design'],
		createdAt: '2026-08-01T00:00:00.000Z',
		updatedAt: '2026-08-02T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Workshop Planning',
		summary: 'Plan a multi-day hybrid workshop.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['planning'],
		createdAt: '2026-09-01T00:00:00.000Z',
		updatedAt: '2026-09-02T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Prompt Drafting',
		summary: 'Draft prompts before a review.',
		modality: 'online',
		status: 'draft',
		tags: ['prompts'],
		createdAt: '2026-01-05T00:00:00.000Z',
		updatedAt: '2026-01-06T00:00:00.000Z',
	},
];

export const listCourses = (query: CourseQuery): CoursePage => {
	const sorted = courses.filter((course) => matchesCourse(course, query)).sort((left, right) => compareCourses(left, right, query.sort));
	const totalItems = sorted.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
	const start = (query.page - 1) * query.pageSize;
	return { items: sorted.slice(start, start + query.pageSize), page: query.page, pageSize: query.pageSize, totalItems, totalPages };
};
