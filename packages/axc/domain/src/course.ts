export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
export type CourseModality = (typeof COURSE_MODALITIES)[number];

export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_SORTS = ['title', 'createdAt', 'updatedAt'] as const;
export type CourseSort = (typeof COURSE_SORTS)[number];

export const DEFAULT_COURSE_PAGE = 1;
export const DEFAULT_COURSE_PAGE_SIZE = 10;
export const MAX_COURSE_PAGE_SIZE = 50;
export const DEFAULT_COURSE_SORT: CourseSort = 'title';

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

export function isCourseModality(value: string): value is CourseModality {
	return (COURSE_MODALITIES as readonly string[]).includes(value);
}

export function isCourseStatus(value: string): value is CourseStatus {
	return (COURSE_STATUSES as readonly string[]).includes(value);
}

export function isCourseSort(value: string): value is CourseSort {
	return (COURSE_SORTS as readonly string[]).includes(value);
}

export function copyCourse(course: Course): Course {
	return {
		id: course.id,
		title: course.title,
		summary: course.summary,
		modality: course.modality,
		status: course.status,
		tags: [...course.tags],
		createdAt: course.createdAt,
		updatedAt: course.updatedAt,
	};
}

/**
 * Fixed catalog fixture. Search tests and enrollment rules depend on these ids,
 * statuses, and the placement of keywords in title, summary, or tags.
 */
export const COURSE_FIXTURES: readonly Course[] = [
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
		title: 'Security Operations Lab',
		summary: 'Hands-on practice for incident response teams.',
		modality: 'in-person',
		status: 'active',
		tags: ['security', 'operations'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-05-01T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Hybrid Delivery Practicum',
		summary: 'Blended classroom and remote facilitation.',
		modality: 'hybrid',
		status: 'active',
		tags: ['facilitation'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-04-01T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Draft Onboarding Outline',
		summary: 'Unpublished outline for new learner onboarding.',
		modality: 'online',
		status: 'draft',
		tags: ['onboarding'],
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-02T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Retired Compliance Briefing',
		summary: 'Former compliance briefing kept for reference.',
		modality: 'in-person',
		status: 'retired',
		tags: ['compliance'],
		createdAt: '2025-06-01T00:00:00.000Z',
		updatedAt: '2025-12-01T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'Cloud Security Basics',
		summary: 'Core cloud security controls for builders.',
		modality: 'online',
		status: 'active',
		tags: ['cloud', 'security'],
		createdAt: '2026-04-10T00:00:00.000Z',
		updatedAt: '2026-04-11T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Accessible Content Design',
		summary: 'Practical accessibility for course authors.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['accessibility', 'design'],
		createdAt: '2026-02-20T00:00:00.000Z',
		updatedAt: '2026-03-02T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Workshop Facilitation',
		summary: 'In-person facilitation techniques.',
		modality: 'in-person',
		status: 'active',
		tags: ['facilitation'],
		createdAt: '2026-05-05T00:00:00.000Z',
		updatedAt: '2026-05-06T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Data Privacy Essentials',
		summary: 'Privacy principles summarized for staff.',
		modality: 'online',
		status: 'retired',
		tags: ['privacy', 'staff-only'],
		createdAt: '2025-11-11T00:00:00.000Z',
		updatedAt: '2026-01-20T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Hybrid Team Leadership',
		summary: 'Leading hybrid teams through change.',
		modality: 'hybrid',
		status: 'active',
		tags: ['leadership'],
		createdAt: '2026-03-15T00:00:00.000Z',
		updatedAt: '2026-06-15T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Secure Coding Clinic',
		summary: 'Practice threat modeling and SECURITY reviews.',
		modality: 'online',
		status: 'active',
		tags: ['development'],
		createdAt: '2026-06-01T00:00:00.000Z',
		updatedAt: '2026-06-02T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Archive Tag Sampler',
		summary: 'Historical sampler kept for catalog coverage.',
		modality: 'in-person',
		status: 'draft',
		tags: ['AI', 'catalog-sample'],
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-02-01T00:00:00.000Z',
	},
];
