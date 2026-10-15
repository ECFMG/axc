import type { Course, CourseCatalog } from '@axc/domain';

const seedCourses: readonly Course[] = [
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
		title: 'Accessibility for Online Courses',
		summary: 'Design inclusive learning experiences for remote students.',
		modality: 'online',
		status: 'active',
		tags: ['accessibility', 'design'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-02-10T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Authoring Draft Curriculum',
		summary: 'Plan modules, objectives, and assessments before publication.',
		modality: 'online',
		status: 'draft',
		tags: ['authoring', 'content'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-03-02T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Blue Team Lab',
		summary: 'Hands-on defensive exercises for training operators.',
		modality: 'in-person',
		status: 'active',
		tags: ['security'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-15T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Classroom Data Privacy',
		summary: 'Handle learner data in instructor-led rooms.',
		modality: 'in-person',
		status: 'retired',
		tags: ['privacy', 'compliance'],
		createdAt: '2026-01-20T00:00:00.000Z',
		updatedAt: '2026-05-01T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'Cloud Fundamentals',
		summary: 'Shared infrastructure for hybrid training delivery.',
		modality: 'hybrid',
		status: 'active',
		tags: ['cloud', 'infrastructure'],
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-05-20T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Compliance Audit Clinic',
		summary: 'Retrospective review of course compliance evidence.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['compliance', 'audit'],
		createdAt: '2026-06-01T00:00:00.000Z',
		updatedAt: '2026-07-01T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Hybrid Leadership Studio',
		summary: 'Facilitation practice for mixed-modality cohorts.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['leadership', 'security'],
		createdAt: '2026-02-15T00:00:00.000Z',
		updatedAt: '2026-08-01T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Incident Response Weekend',
		summary: 'Classroom drills for operational incidents.',
		modality: 'in-person',
		status: 'active',
		tags: ['incident-response', 'operations'],
		createdAt: '2026-07-01T00:00:00.000Z',
		updatedAt: '2026-07-15T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Machine Learning Intro',
		summary: 'Core models and evaluation for course authors.',
		modality: 'online',
		status: 'draft',
		tags: ['ai', 'ml'],
		createdAt: '2026-08-01T00:00:00.000Z',
		updatedAt: '2026-08-05T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Product Design with AI',
		summary: 'Studio course on AI-assisted learning products.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['AI', 'design'],
		createdAt: '2026-03-15T00:00:00.000Z',
		updatedAt: '2026-04-01T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Threat Modeling Workshop',
		summary: 'Practice security reviews on training services.',
		modality: 'in-person',
		status: 'active',
		tags: ['modeling'],
		createdAt: '2026-09-01T00:00:00.000Z',
		updatedAt: '2026-09-10T00:00:00.000Z',
	},
];

export function createInMemoryCourseCatalog(courses: readonly Course[] = seedCourses): CourseCatalog {
	const snapshot = courses.map(copyCourse);
	return {
		listCourses() {
			return Promise.resolve(snapshot.map(copyCourse));
		},
	};
}

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
