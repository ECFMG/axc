import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export const courseModalities = ['online', 'in-person', 'hybrid'] as const;
export type CourseModality = (typeof courseModalities)[number];

export const courseStatuses = ['draft', 'active', 'retired'] as const;
export type CourseStatus = (typeof courseStatuses)[number];

export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: CourseModality;
	status: CourseStatus;
	tags: readonly string[];
	createdAt: string;
	updatedAt: string;
}

/** Read port for the training course catalog. */
export interface CourseCatalog {
	listCourses(): Promise<readonly Course[]>;
}

/** Sample catalog used by the API process and by tests. Dates are ISO-8601 UTC. */
export const courseCatalogSeed: readonly Course[] = [
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
		title: 'Security Coding Workshop',
		summary: 'Practice defensive coding in a classroom.',
		modality: 'in-person',
		status: 'active',
		tags: ['engineering'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-15T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Data Privacy Overview',
		summary: 'Covers retention rules and a security checklist for personal data.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['privacy'],
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-05-20T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Platform Operations',
		summary: 'Run production services.',
		modality: 'online',
		status: 'retired',
		tags: ['Security'],
		createdAt: '2026-01-20T00:00:00.000Z',
		updatedAt: '2026-02-01T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Classroom Facilitation',
		summary: 'Practice teaching techniques.',
		modality: 'in-person',
		status: 'draft',
		tags: ['teaching'],
		createdAt: '2026-06-01T00:00:00.000Z',
		updatedAt: '2026-06-02T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'Hybrid Delivery Lab',
		summary: 'Blend classroom and remote sessions.',
		modality: 'hybrid',
		status: 'active',
		tags: ['delivery'],
		createdAt: '2026-02-10T00:00:00.000Z',
		updatedAt: '2026-07-01T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Draft Curriculum Design',
		summary: 'Outline a new course.',
		modality: 'online',
		status: 'draft',
		tags: ['curriculum'],
		createdAt: '2026-01-05T00:00:00.000Z',
		updatedAt: '2026-01-06T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Retired Archive Methods',
		summary: 'How to retire old materials.',
		modality: 'in-person',
		status: 'retired',
		tags: ['archive'],
		createdAt: '2026-08-01T00:00:00.000Z',
		updatedAt: '2026-08-02T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'AI Product Studio',
		summary: 'Build AI-assisted products.',
		modality: 'hybrid',
		status: 'active',
		tags: ['ai', 'product'],
		createdAt: '2026-03-15T00:00:00.000Z',
		updatedAt: '2026-03-20T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Security Operations Center',
		summary: 'Monitor incidents.',
		modality: 'online',
		status: 'draft',
		tags: ['operations'],
		createdAt: '2026-09-01T00:00:00.000Z',
		updatedAt: '2026-09-02T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'In-Person Coaching',
		summary: 'Coach teams on site.',
		modality: 'in-person',
		status: 'active',
		tags: ['coaching'],
		createdAt: '2026-07-01T00:00:00.000Z',
		updatedAt: '2026-07-15T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Zebra Onboarding',
		summary: 'Welcome new cohorts.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['onboarding'],
		createdAt: '2025-12-01T00:00:00.000Z',
		updatedAt: '2026-12-01T00:00:00.000Z',
	},
];
