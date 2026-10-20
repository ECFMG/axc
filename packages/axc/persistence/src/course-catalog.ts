import type { Course, CourseCatalog } from '@axc/domain';

const courseCatalogSeed: readonly Course[] = [
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
		title: 'Workshop for Teams',
		summary: 'Hands-on practice covering SECURITY reviews.',
		modality: 'in-person',
		status: 'active',
		tags: ['workshop'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-02-02T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Platform Operations',
		summary: 'Run hybrid platforms.',
		modality: 'hybrid',
		status: 'active',
		tags: ['Security'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-03-10T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Cloud Basics',
		summary: 'Introduction to cloud services.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['cloud'],
		createdAt: '2025-11-01T00:00:00.000Z',
		updatedAt: '2025-12-01T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Leadership Lab',
		summary: 'Facilitation for new leads.',
		modality: 'in-person',
		status: 'retired',
		tags: ['leadership'],
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-06-01T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'Data Privacy',
		summary: 'Privacy obligations for product teams.',
		modality: 'online',
		status: 'active',
		tags: ['privacy'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-15T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'AI Ethics',
		summary: 'Responsible use of AI in the enterprise.',
		modality: 'online',
		status: 'draft',
		tags: ['ai', 'ethics'],
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-05-02T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Incident Response',
		summary: 'Respond to production incidents.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['operations'],
		createdAt: '2023-08-01T00:00:00.000Z',
		updatedAt: '2025-01-01T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'New Hire Onboarding',
		summary: 'First week orientation.',
		modality: 'in-person',
		status: 'draft',
		tags: ['hr'],
		createdAt: '2026-06-01T00:00:00.000Z',
		updatedAt: '2026-06-02T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Facilitation Studio',
		summary: 'Practice sessions for trainers.',
		modality: 'hybrid',
		status: 'active',
		tags: ['AI', 'facilitation'],
		createdAt: '2026-01-20T00:00:00.000Z',
		updatedAt: '2026-07-01T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Workplace Safety',
		summary: 'On-site safety briefing.',
		modality: 'in-person',
		status: 'active',
		tags: ['safety'],
		createdAt: '2026-03-15T00:00:00.000Z',
		updatedAt: '2026-03-16T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Accessibility Basics',
		summary: 'Design courses that include every learner.',
		modality: 'online',
		status: 'retired',
		tags: ['accessibility'],
		createdAt: '2022-01-01T00:00:00.000Z',
		updatedAt: '2022-02-01T00:00:00.000Z',
	},
];

function copyCourse(course: Course): Course {
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

/** In-memory catalog fixture used by local and test hosts. */
export function createCourseCatalog(): CourseCatalog {
	return {
		listCourses() {
			return Promise.resolve(courseCatalogSeed.map(copyCourse));
		},
	};
}
