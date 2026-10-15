import type { Course, CourseCatalog } from '@axc/domain';

const courseCatalogSeed = [
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
		title: 'SECURITY Operations Lab',
		summary: 'Hands-on lab for shift leads.',
		modality: 'in-person',
		status: 'active',
		tags: ['operations'],
		createdAt: '2026-08-01T00:00:00.000Z',
		updatedAt: '2026-08-15T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Hybrid Leadership',
		summary: 'Planning course for hybrid teams, including a security review.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['leadership'],
		createdAt: '2026-03-15T00:00:00.000Z',
		updatedAt: '2026-03-20T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Data Privacy Basics',
		summary: 'How to handle personal data in training systems.',
		modality: 'online',
		status: 'retired',
		tags: ['privacy', 'Security'],
		createdAt: '2026-01-20T00:00:00.000Z',
		updatedAt: '2026-02-01T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Classroom Facilitation',
		summary: 'Practice for instructors running a live room.',
		modality: 'in-person',
		status: 'draft',
		tags: ['teaching'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-02T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'AI Product Design',
		summary: 'Design workshops for AI-assisted product teams.',
		modality: 'hybrid',
		status: 'active',
		tags: ['ai', 'design'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-05-01T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Incident Response',
		summary: 'Runbooks for training-platform incidents.',
		modality: 'online',
		status: 'active',
		tags: ['security', 'operations'],
		createdAt: '2026-02-15T00:00:00.000Z',
		updatedAt: '2026-04-15T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Retired Workshop',
		summary: 'Earlier workshop kept for transcript history.',
		modality: 'in-person',
		status: 'retired',
		tags: ['workshop'],
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-05T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Hybrid Compliance',
		summary: 'Compliance obligations for mixed delivery courses.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['compliance', 'ai'],
		createdAt: '2026-06-01T00:00:00.000Z',
		updatedAt: '2026-07-01T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Draft Online Onboarding',
		summary: 'Unpublished onboarding path for new learners.',
		modality: 'online',
		status: 'draft',
		tags: ['onboarding'],
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-05-02T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Platform Engineering',
		summary: 'Operate the systems behind the course catalog.',
		modality: 'in-person',
		status: 'active',
		tags: ['platform'],
		createdAt: '2026-07-01T00:00:00.000Z',
		updatedAt: '2026-07-02T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Accessibility Fundamentals',
		summary: 'Make course content usable for more learners.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['accessibility', 'AI'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-03-02T00:00:00.000Z',
	},
] as const satisfies readonly Course[];

/** shortcut: static in-memory seed, replace when course storage is wired to a database. */
export function createCourseCatalog(): CourseCatalog {
	assertCourseCatalogSeed(courseCatalogSeed);
	return {
		listCourses: () => courseCatalogSeed,
	};
}

function assertCourseCatalogSeed(courses: readonly Course[]): void {
	const ids = new Set(courses.map((course) => course.id));
	const modalities = new Set(courses.map((course) => course.modality));
	const statuses = new Set(courses.map((course) => course.status));
	const hasTags = courses.some((course) => course.tags.length > 0);
	if (ids.size !== courses.length || courses.length < 12 || modalities.size < 3 || statuses.size < 3 || !hasTags) {
		throw new Error('Course catalog seed must include at least 12 courses with unique ids and mixed modality, status, and tags');
	}
}
