import { COURSE_MODALITIES, COURSE_STATUSES, type Course } from '@axc/domain';

/** In-memory training catalog used when no external database is configured. */
export function loadCourseCatalog(): readonly Course[] {
	return catalog;
}

const catalog = assertCatalog([
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
		title: 'Secure Coding Lab',
		summary: 'Hands-on coding exercises for application teams.',
		modality: 'in-person',
		status: 'active',
		tags: ['coding', 'security'],
		createdAt: '2026-02-10T00:00:00.000Z',
		updatedAt: '2026-06-15T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Hybrid Threat Modeling',
		summary: 'Workshop on architecture risks.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['architecture', 'security'],
		createdAt: '2026-01-20T00:00:00.000Z',
		updatedAt: '2026-02-01T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Archived Review Program',
		summary: 'Historical review of past offerings.',
		modality: 'online',
		status: 'retired',
		tags: ['audit', 'security'],
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-09-01T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'AI Product Design',
		summary: 'Design practices for intelligent products.',
		modality: 'online',
		status: 'active',
		tags: ['ai', 'design'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-07-01T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'Facilitation Basics',
		summary: 'Practice leading a room.',
		modality: 'in-person',
		status: 'draft',
		tags: ['teaching'],
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-05-02T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Classroom Operations',
		summary: 'Running a hybrid classroom.',
		modality: 'hybrid',
		status: 'active',
		tags: ['operations'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-03-15T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Draft Onboarding',
		summary: 'First-week orientation material.',
		modality: 'online',
		status: 'draft',
		tags: ['onboarding'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-02T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Workshop Archive',
		summary: 'Closed workshop series.',
		modality: 'in-person',
		status: 'retired',
		tags: ['workshop'],
		createdAt: '2026-07-01T00:00:00.000Z',
		updatedAt: '2026-07-20T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Leadership Studio',
		summary: 'Closed leadership cohort.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['leadership'],
		createdAt: '2026-06-01T00:00:00.000Z',
		updatedAt: '2026-08-01T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Clinical Communication',
		summary: 'Includes incident response security drills for care teams.',
		modality: 'in-person',
		status: 'active',
		tags: ['communication'],
		createdAt: '2026-08-01T00:00:00.000Z',
		updatedAt: '2026-08-15T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Data Privacy Essentials',
		summary: 'Privacy and compliance overview.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['privacy', 'compliance'],
		createdAt: '2026-03-10T00:00:00.000Z',
		updatedAt: '2026-04-10T00:00:00.000Z',
	},
]);

function assertCatalog(courses: readonly Course[]): readonly Course[] {
	const ids = new Set<string>();
	for (const course of courses) {
		if (ids.has(course.id)) {
			throw new Error(`Duplicate course id ${course.id}`);
		}
		ids.add(course.id);
		if (!(COURSE_MODALITIES as readonly string[]).includes(course.modality)) {
			throw new Error(`Invalid modality for ${course.id}`);
		}
		if (!(COURSE_STATUSES as readonly string[]).includes(course.status)) {
			throw new Error(`Invalid status for ${course.id}`);
		}
		if (course.tags.length === 0 || Number.isNaN(Date.parse(course.createdAt)) || Number.isNaN(Date.parse(course.updatedAt))) {
			throw new Error(`Course ${course.id} is missing tags or timestamps`);
		}
	}
	if (courses.length < 12) {
		throw new Error('Course catalog must contain at least 12 courses');
	}
	return courses;
}
