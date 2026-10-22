import type { Course, CourseRepository, EnrollmentRequest, EnrollmentRequestRepository } from '@axc/domain';
import { EntityNotFoundError } from '@axc/domain';

export interface CatalogStores {
	courses: CourseRepository;
	enrollmentRequests: EnrollmentRequestRepository;
}

const SEEDED_COURSES: readonly Course[] = [
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
		title: 'Classroom Leadership Lab',
		summary: 'Practice leading an in-person engineering cohort.',
		modality: 'in-person',
		status: 'active',
		tags: ['leadership'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-02-02T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Cloud Security Workshop',
		summary: 'Draft workshop on securing cloud delivery pipelines.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['security', 'cloud'],
		createdAt: '2026-02-10T00:00:00.000Z',
		updatedAt: '2026-02-11T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Data Privacy Essentials',
		summary: 'Retired overview of handling personal data.',
		modality: 'online',
		status: 'retired',
		tags: ['privacy'],
		createdAt: '2026-01-20T00:00:00.000Z',
		updatedAt: '2026-03-01T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Hybrid Facilitation Studio',
		summary: 'Facilitate a class that meets both online and on site.',
		modality: 'hybrid',
		status: 'active',
		tags: ['facilitation'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-03-02T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'In-Person Incident Response',
		summary: 'Tabletop practice for operational incidents.',
		modality: 'in-person',
		status: 'active',
		tags: ['security', 'incident'],
		createdAt: '2026-03-15T00:00:00.000Z',
		updatedAt: '2026-03-16T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Online Writing for Engineers',
		summary: 'Write clear technical explanations for distributed teams.',
		modality: 'online',
		status: 'active',
		tags: ['writing'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-02T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Product Strategy with AI',
		summary: 'Plan a product roadmap that uses assistive models.',
		modality: 'hybrid',
		status: 'active',
		tags: ['AI', 'product'],
		createdAt: '2026-04-20T00:00:00.000Z',
		updatedAt: '2026-05-01T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Retired Onboarding Seminar',
		summary: 'Former welcome seminar for new practitioners.',
		modality: 'in-person',
		status: 'retired',
		tags: ['onboarding'],
		createdAt: '2026-01-05T00:00:00.000Z',
		updatedAt: '2026-06-15T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Secure Coding Draft',
		summary: 'Unpublished draft of secure coding exercises.',
		modality: 'online',
		status: 'draft',
		tags: ['security', 'coding'],
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-05-02T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Tagging and Search Lab',
		summary: 'Practice finding security issues in catalog records.',
		modality: 'online',
		status: 'active',
		tags: ['search'],
		createdAt: '2026-05-10T00:00:00.000Z',
		updatedAt: '2026-05-11T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Workplace Safety Basics',
		summary: 'Draft briefing for classroom safety checks.',
		modality: 'in-person',
		status: 'draft',
		tags: ['safety'],
		createdAt: '2026-05-20T00:00:00.000Z',
		updatedAt: '2026-05-21T00:00:00.000Z',
	},
];

/** Process-local catalog. The sample API does not call the Mongoose adapter. */
export function createCatalogStores(): CatalogStores {
	const courses = new Map<string, Course>(SEEDED_COURSES.map((course) => [course.id, clone(course)]));
	const enrollmentRequests = new Map<string, EnrollmentRequest>();
	let nextEnrollmentNumber = 1;

	return {
		courses: {
			get(id: string): Promise<Course> {
				const course = courses.get(id);
				if (course === undefined) {
					return Promise.reject(new EntityNotFoundError('course', id));
				}
				return Promise.resolve(clone(course));
			},
			save(item: Course): Promise<Course> {
				const copy = clone(item);
				courses.set(copy.id, copy);
				return Promise.resolve(clone(copy));
			},
			list(): Promise<readonly Course[]> {
				return Promise.resolve([...courses.values()].map((course) => clone(course)));
			},
		},
		enrollmentRequests: {
			get(id: string): Promise<EnrollmentRequest> {
				const request = enrollmentRequests.get(id);
				if (request === undefined) {
					return Promise.reject(new EntityNotFoundError('enrollment-request', id));
				}
				return Promise.resolve(clone(request));
			},
			save(item: EnrollmentRequest): Promise<EnrollmentRequest> {
				const copy = clone(item);
				enrollmentRequests.set(copy.id, copy);
				return Promise.resolve(clone(copy));
			},
			list(): Promise<readonly EnrollmentRequest[]> {
				return Promise.resolve([...enrollmentRequests.values()].map((request) => clone(request)));
			},
			allocateId(): string {
				const id = `enroll-${String(nextEnrollmentNumber).padStart(3, '0')}`;
				nextEnrollmentNumber += 1;
				return id;
			},
		},
	};
}

function clone<T>(value: T): T {
	return structuredClone(value);
}
