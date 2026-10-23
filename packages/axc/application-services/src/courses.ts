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

const courses: readonly Course[] = [
	{
		id: 'course-001',
		title: 'AI Security Foundations',
		summary: 'Introductory course on secure AI-assisted development.',
		modality: 'online',
		status: 'active',
		tags: ['ai', 'security'],
		createdAt: '2026-01-15T00:00:00.000Z',
		updatedAt: '2026-06-01T00:00:00.000Z',
	},
	{
		id: 'course-002',
		title: 'Operations Security Lab',
		summary: 'Hands-on lab for security operations.',
		modality: 'in-person',
		status: 'active',
		tags: ['security', 'operations'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-02-02T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Leadership Draft',
		summary: 'Draft leadership course.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['leadership'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-03-02T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Mainframe Retired',
		summary: 'Retired mainframe curriculum.',
		modality: 'online',
		status: 'retired',
		tags: ['legacy'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-02T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Cloud Architecture Basics',
		summary: 'Design resilient cloud systems.',
		modality: 'online',
		status: 'active',
		tags: ['cloud'],
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-05-02T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'In Person Workshop',
		summary: 'Workshop on applied AI tools.',
		modality: 'in-person',
		status: 'active',
		tags: ['workshop', 'ai'],
		createdAt: '2026-06-02T00:00:00.000Z',
		updatedAt: '2026-06-03T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Online Primer Draft',
		summary: 'Draft primer not yet offered.',
		modality: 'online',
		status: 'draft',
		tags: ['primer'],
		createdAt: '2026-06-03T00:00:00.000Z',
		updatedAt: '2026-06-04T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Hybrid Active Studio',
		summary: 'Studio format hybrid delivery.',
		modality: 'hybrid',
		status: 'active',
		tags: ['studio', 'ai'],
		createdAt: '2026-06-04T00:00:00.000Z',
		updatedAt: '2026-06-05T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Data Privacy Essentials',
		summary: 'Privacy controls for product teams.',
		modality: 'online',
		status: 'active',
		tags: ['privacy', 'security'],
		createdAt: '2026-06-05T00:00:00.000Z',
		updatedAt: '2026-06-06T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Retired Hybrid Archive',
		summary: 'Archived hybrid seminar.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['archive'],
		createdAt: '2026-06-06T00:00:00.000Z',
		updatedAt: '2026-06-07T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'People Management',
		summary: 'Covers SECURITY awareness for new managers.',
		modality: 'in-person',
		status: 'active',
		tags: ['management'],
		createdAt: '2026-06-07T00:00:00.000Z',
		updatedAt: '2026-06-08T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Tag Case Sample',
		summary: 'Sample course for tag casing.',
		modality: 'in-person',
		status: 'draft',
		tags: ['AI'],
		createdAt: '2026-06-08T00:00:00.000Z',
		updatedAt: '2026-06-09T00:00:00.000Z',
	},
];

export const findCourse = (id: string): Course | undefined => courses.find((course) => course.id === id);

const haystack = (course: Course): string => `${course.title}\n${course.summary}\n${course.tags.join('\n')}`.toLowerCase();

const matches = (course: Course, query: CourseQuery): boolean => {
	if (query.q !== undefined && !haystack(course).includes(query.q.toLowerCase())) return false;
	if (query.modality !== undefined && course.modality !== query.modality) return false;
	if (query.status !== undefined && course.status !== query.status) return false;
	if (query.tag !== undefined && !course.tags.some((tag) => tag.toLowerCase() === query.tag?.toLowerCase())) return false;
	return true;
};

const compareText = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

const compareCourses = (left: Course, right: Course, sort: CourseSort): number => compareText(left[sort], right[sort]) || compareText(left.id, right.id);

export const listCourses = (query: CourseQuery): CoursePage => {
	const sorted = courses.filter((course) => matches(course, query)).sort((left, right) => compareCourses(left, right, query.sort));
	const totalItems = sorted.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
	const start = (query.page - 1) * query.pageSize;
	return {
		items: sorted.slice(start, start + query.pageSize),
		page: query.page,
		pageSize: query.pageSize,
		totalItems,
		totalPages,
	};
};
