export const courseModalities = ['online', 'in-person', 'hybrid'] as const;
export type CourseModality = (typeof courseModalities)[number];

export const courseStatuses = ['draft', 'active', 'retired'] as const;
export type CourseStatus = (typeof courseStatuses)[number];

export const courseSorts = ['title', 'createdAt', 'updatedAt'] as const;
export type CourseSort = (typeof courseSorts)[number];

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
		title: 'Classroom Facilitation',
		summary: 'How to run a workshop for new instructors.',
		modality: 'in-person',
		status: 'active',
		tags: ['teaching'],
		createdAt: '2025-03-01T00:00:00.000Z',
		updatedAt: '2025-11-01T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Hybrid Delivery Lab',
		summary: 'Practice blending rooms and remote sessions.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['delivery'],
		createdAt: '2026-02-02T00:00:00.000Z',
		updatedAt: '2026-02-20T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Data Privacy Basics',
		summary: 'Covers security of learner records.',
		modality: 'online',
		status: 'retired',
		tags: ['privacy'],
		createdAt: '2024-08-08T00:00:00.000Z',
		updatedAt: '2025-01-01T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Prompt Craft',
		summary: 'Writing prompts for course authors.',
		modality: 'online',
		status: 'active',
		tags: ['ai', 'writing'],
		createdAt: '2026-04-04T00:00:00.000Z',
		updatedAt: '2026-05-05T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'Campus Safety Walkthrough',
		summary: 'On-site orientation for instructors.',
		modality: 'in-person',
		status: 'draft',
		tags: ['safety', 'Security'],
		createdAt: '2026-03-03T00:00:00.000Z',
		updatedAt: '2026-03-18T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Vendor Onboarding',
		summary: 'Steps for new training partners.',
		modality: 'hybrid',
		status: 'active',
		tags: ['vendors', 'SECURITY'],
		createdAt: '2025-12-12T00:00:00.000Z',
		updatedAt: '2026-01-02T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Assessment Design',
		summary: 'Build fair quizzes and rubrics.',
		modality: 'online',
		status: 'draft',
		tags: ['assessment'],
		createdAt: '2026-07-07T00:00:00.000Z',
		updatedAt: '2026-07-08T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Leadership Circle',
		summary: 'Peer coaching for program leads.',
		modality: 'in-person',
		status: 'retired',
		tags: ['leadership'],
		createdAt: '2023-05-05T00:00:00.000Z',
		updatedAt: '2024-05-05T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Accessibility Studio',
		summary: 'Make lessons usable for everyone.',
		modality: 'hybrid',
		status: 'active',
		tags: ['a11y', 'ai'],
		createdAt: '2026-08-08T00:00:00.000Z',
		updatedAt: '2026-09-09T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Incident Notes',
		summary: 'A retired online briefing.',
		modality: 'online',
		status: 'retired',
		tags: ['ops'],
		createdAt: '2022-02-02T00:00:00.000Z',
		updatedAt: '2022-12-12T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Zoom Etiquette',
		summary: 'Short live-online manners class.',
		modality: 'online',
		status: 'active',
		tags: ['remote'],
		createdAt: '2026-09-01T00:00:00.000Z',
		updatedAt: '2026-09-02T00:00:00.000Z',
	},
	{
		id: 'course-013',
		title: 'Security Awareness',
		summary: 'Stay alert during live sessions.',
		modality: 'online',
		status: 'active',
		tags: ['awareness'],
		createdAt: '2026-10-10T00:00:00.000Z',
		updatedAt: '2026-10-11T00:00:00.000Z',
	},
];

const includesFold = (haystack: string, needle: string): boolean => haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase());

const matchesCourse = (course: Course, query: CourseQuery): boolean => {
	if (query.modality !== undefined && course.modality !== query.modality) {
		return false;
	}
	if (query.status !== undefined && course.status !== query.status) {
		return false;
	}
	if (query.tag !== undefined && !course.tags.some((tag) => tag.toLocaleLowerCase() === query.tag?.toLocaleLowerCase())) {
		return false;
	}
	if (query.q !== undefined) {
		const keyword = query.q;
		const matchesKeyword = includesFold(course.title, keyword) || includesFold(course.summary, keyword) || course.tags.some((tag) => includesFold(tag, keyword));
		if (!matchesKeyword) {
			return false;
		}
	}
	return true;
};

export const listCourses = (query: CourseQuery): CoursePage => {
	const matched = courses.filter((course) => matchesCourse(course, query));
	const sorted = [...matched].sort((left, right) => {
		const primary = left[query.sort].localeCompare(right[query.sort]);
		return primary !== 0 ? primary : left.id.localeCompare(right.id);
	});
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
