import type { Course, CourseCatalog } from '@axc/domain';

/** Fixture catalog of 12 courses used by GET /api/courses. */
const courseSeed: readonly Course[] = [
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
		title: 'In-Person Security Workshop',
		summary: 'Guided practice for threat modeling with a local cohort.',
		modality: 'in-person',
		status: 'active',
		tags: ['security', 'workshop'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-05-01T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Hybrid Leadership Lab',
		summary: 'Coaching circle for new team leads.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['leadership'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-03-15T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Online Data Privacy',
		summary: 'Privacy principles for product teams.',
		modality: 'online',
		status: 'retired',
		tags: ['privacy', 'compliance'],
		createdAt: '2025-11-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Classroom Facilitation',
		summary: 'Techniques for instructor-led sessions.',
		modality: 'in-person',
		status: 'draft',
		tags: ['teaching'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-02T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'Hybrid AI Studio',
		summary: 'Build a small assistant with a mentor on site and online.',
		modality: 'hybrid',
		status: 'active',
		tags: ['ai', 'studio'],
		createdAt: '2026-01-20T00:00:00.000Z',
		updatedAt: '2026-07-01T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Cloud Operations Basics',
		summary: 'Operate a small service through incidents and releases.',
		modality: 'online',
		status: 'active',
		tags: ['cloud', 'operations'],
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-05-20T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Retired Onsite Safety',
		summary: 'Legacy safety orientation kept for audit history.',
		modality: 'in-person',
		status: 'retired',
		tags: ['safety'],
		createdAt: '2025-06-01T00:00:00.000Z',
		updatedAt: '2025-12-01T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Draft Hybrid Compliance',
		summary: 'Control mapping workshop still being edited.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['compliance'],
		createdAt: '2026-06-01T00:00:00.000Z',
		updatedAt: '2026-06-10T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Active Online Teaching',
		summary: 'Practice teaching techniques for live virtual classrooms.',
		modality: 'online',
		status: 'active',
		tags: ['teaching', 'assessment'],
		createdAt: '2026-02-15T00:00:00.000Z',
		updatedAt: '2026-04-15T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Security for Managers',
		summary: 'Risk decisions for people who sponsor delivery teams.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['security', 'leadership'],
		createdAt: '2025-08-01T00:00:00.000Z',
		updatedAt: '2026-02-01T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Accessibility Fundamentals',
		summary: 'Design inclusive learning experiences.',
		modality: 'online',
		status: 'draft',
		tags: ['accessibility'],
		createdAt: '2026-07-01T00:00:00.000Z',
		updatedAt: '2026-07-02T00:00:00.000Z',
	},
];

export function createCourseCatalog(courses: readonly Course[] = courseSeed): CourseCatalog {
	const stored = courses.map((course) => cloneCourse(course));
	return {
		list(): readonly Course[] {
			return stored.map((course) => cloneCourse(course));
		},
	};
}

function cloneCourse(course: Course): Course {
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
