import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export const courseModalities = ['online', 'in-person', 'hybrid'] as const;
export type CourseModality = (typeof courseModalities)[number];

export const courseStatuses = ['draft', 'active', 'retired'] as const;
export type CourseStatus = (typeof courseStatuses)[number];

export const courseSortFields = ['title', 'createdAt', 'updatedAt'] as const;
export type CourseSortField = (typeof courseSortFields)[number];

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

export interface CourseCatalog {
	list(): readonly Course[];
}

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
		title: 'Workshop: In-Person Leadership',
		summary: 'Facilitation practice for team leads.',
		modality: 'in-person',
		status: 'active',
		tags: ['leadership'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-02-02T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Hybrid Delivery Basics',
		summary: 'Blend classroom and remote sessions.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['delivery'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-03-15T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'SECURITY Operations',
		summary: 'Incident response for operators.',
		modality: 'online',
		status: 'retired',
		tags: ['operations'],
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-04-01T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Data Privacy',
		summary: 'This summary mentions Security in prose.',
		modality: 'online',
		status: 'active',
		tags: ['compliance'],
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-05-02T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'Cloud Cost Control',
		summary: 'FinOps for platform teams.',
		modality: 'hybrid',
		status: 'active',
		tags: ['cloud', 'finance'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-12-01T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Draft Onboarding',
		summary: 'New hire orientation.',
		modality: 'in-person',
		status: 'draft',
		tags: ['onboarding'],
		createdAt: '2026-06-01T00:00:00.000Z',
		updatedAt: '2026-06-02T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Retired Classroom Lab',
		summary: 'Hardware lab exercises.',
		modality: 'in-person',
		status: 'retired',
		tags: ['lab'],
		createdAt: '2025-11-01T00:00:00.000Z',
		updatedAt: '2025-12-01T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Hybrid Coaching',
		summary: 'Coaching managers who use assistants.',
		modality: 'hybrid',
		status: 'active',
		tags: ['coaching', 'ai'],
		createdAt: '2026-07-01T00:00:00.000Z',
		updatedAt: '2026-08-01T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Online Writing',
		summary: 'Clear technical writing.',
		modality: 'online',
		status: 'draft',
		tags: ['writing'],
		createdAt: '2026-08-01T00:00:00.000Z',
		updatedAt: '2026-08-02T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Classroom Safety Drills',
		summary: 'Physical classroom safety drills.',
		modality: 'in-person',
		status: 'active',
		tags: ['Security'],
		createdAt: '2026-09-01T00:00:00.000Z',
		updatedAt: '2026-09-02T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Accessibility Reviews',
		summary: 'Review interfaces for inclusive design.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['accessibility'],
		createdAt: '2026-10-01T00:00:00.000Z',
		updatedAt: '2026-10-02T00:00:00.000Z',
	},
	{
		id: 'course-013',
		title: 'Active Online Mentoring',
		summary: 'Pair with a mentor for twelve weeks.',
		modality: 'online',
		status: 'active',
		tags: ['mentoring'],
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	},
];
