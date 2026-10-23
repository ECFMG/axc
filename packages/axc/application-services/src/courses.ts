export const courseModalities = ['online', 'in-person', 'hybrid'] as const;
export type CourseModality = (typeof courseModalities)[number];
export const isCourseModality = (v: unknown): v is CourseModality => (courseModalities as readonly unknown[]).includes(v);

export const courseStatuses = ['draft', 'active', 'retired'] as const;
export type CourseStatus = (typeof courseStatuses)[number];
export const isCourseStatus = (v: unknown): v is CourseStatus => (courseStatuses as readonly unknown[]).includes(v);

export const courseSorts = ['title', 'createdAt', 'updatedAt'] as const;
export type CourseSort = (typeof courseSorts)[number];
export const isCourseSort = (v: unknown): v is CourseSort => (courseSorts as readonly unknown[]).includes(v);

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

export interface CoursesQuery {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSort;
}

export interface CourseList {
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
		title: 'Leadership Presence',
		summary: 'In-person workshop for emerging managers.',
		modality: 'in-person',
		status: 'active',
		tags: ['leadership'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-02-20T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Hybrid Cloud Architecture',
		summary: 'Design systems that span public cloud and the data center.',
		modality: 'hybrid',
		status: 'active',
		tags: ['cloud', 'architecture'],
		createdAt: '2025-11-01T00:00:00.000Z',
		updatedAt: '2026-03-01T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Data Ethics Draft',
		summary: 'Draft curriculum on responsible data use.',
		modality: 'online',
		status: 'draft',
		tags: ['ethics', 'data'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-02T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'COBOL Maintenance',
		summary: 'Legacy batch systems for retiring specialists.',
		modality: 'in-person',
		status: 'retired',
		tags: ['legacy'],
		createdAt: '2024-01-10T00:00:00.000Z',
		updatedAt: '2025-12-01T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'Operations Command Center',
		summary: 'Runbooks for production incidents and security.',
		modality: 'hybrid',
		status: 'active',
		tags: ['ops'],
		createdAt: '2026-03-12T00:00:00.000Z',
		updatedAt: '2026-05-01T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Prompt Engineering Studio',
		summary: 'Hands-on patterns for AI product teams.',
		modality: 'online',
		status: 'active',
		tags: ['AI', 'prompts'],
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-05-15T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Workplace Safety Lab',
		summary: 'Facilitated practice for on-site teams.',
		modality: 'in-person',
		status: 'draft',
		tags: ['safety'],
		createdAt: '2026-01-20T00:00:00.000Z',
		updatedAt: '2026-01-21T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Kubernetes Fundamentals',
		summary: 'Containers, scheduling, and cluster operations.',
		modality: 'online',
		status: 'active',
		tags: ['cloud', 'kubernetes'],
		createdAt: '2025-09-01T00:00:00.000Z',
		updatedAt: '2026-02-01T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Waterfall Project Control',
		summary: 'Classic stage-gate delivery for large programs.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['project-management'],
		createdAt: '2023-06-01T00:00:00.000Z',
		updatedAt: '2024-06-01T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Machine Learning Operations',
		summary: 'Ship and monitor models in production.',
		modality: 'online',
		status: 'active',
		tags: ['ai', 'mlops'],
		createdAt: '2026-02-14T00:00:00.000Z',
		updatedAt: '2026-04-14T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Facilitation Skills',
		summary: 'Lead workshops that stay on time and on topic.',
		modality: 'in-person',
		status: 'active',
		tags: ['leadership', 'facilitation'],
		createdAt: '2025-12-15T00:00:00.000Z',
		updatedAt: '2026-01-05T00:00:00.000Z',
	},
	{
		id: 'course-013',
		title: 'Zero Trust Networks',
		summary: 'Identity-aware access for hybrid estates.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['SECURITY', 'network'],
		createdAt: '2026-06-01T00:00:00.000Z',
		updatedAt: '2026-06-02T00:00:00.000Z',
	},
	{
		id: 'course-014',
		title: 'Technical Writing',
		summary: 'Clear documents for engineers and operators.',
		modality: 'online',
		status: 'retired',
		tags: ['communication'],
		createdAt: '2024-08-01T00:00:00.000Z',
		updatedAt: '2025-08-01T00:00:00.000Z',
	},
];

const matchesKeyword = (course: Course, needle: string): boolean => {
	if (course.title.toLowerCase().includes(needle)) return true;
	if (course.summary.toLowerCase().includes(needle)) return true;
	return course.tags.some((tag) => tag.toLowerCase().includes(needle));
};

export const listCourses = (query: CoursesQuery): CourseList => {
	const needle = query.q?.toLowerCase();
	const tag = query.tag?.toLowerCase();
	const filtered = courses.filter((course) => {
		if (query.modality !== undefined && course.modality !== query.modality) return false;
		if (query.status !== undefined && course.status !== query.status) return false;
		if (tag !== undefined && !course.tags.some((item) => item.toLowerCase() === tag)) return false;
		if (needle !== undefined && !matchesKeyword(course, needle)) return false;
		return true;
	});
	const sorted = [...filtered].sort((left, right) => {
		if (query.sort === 'title') return left.title.localeCompare(right.title);
		return left[query.sort].localeCompare(right[query.sort]);
	});
	const totalItems = sorted.length;
	const totalPages = Math.ceil(totalItems / query.pageSize);
	const start = (query.page - 1) * query.pageSize;
	return { items: sorted.slice(start, start + query.pageSize), page: query.page, pageSize: query.pageSize, totalItems, totalPages };
};
