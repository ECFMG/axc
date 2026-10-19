export type { UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';

import type { Course, CourseRepository, EnrollmentRequest, EnrollmentRequestRepository } from '@axc/domain';

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
		title: 'Secure Coding Lab',
		summary: 'Hands-on practice finding and fixing common implementation flaws.',
		modality: 'in-person',
		status: 'active',
		tags: ['security'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-05-01T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Hybrid Architecture Studio',
		summary: 'Design workshops for systems that span classroom and remote work.',
		modality: 'hybrid',
		status: 'active',
		tags: ['architecture'],
		createdAt: '2026-02-10T00:00:00.000Z',
		updatedAt: '2026-04-01T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Draft Prompt Design',
		summary: 'Unpublished exercises for writing reviewable prompts.',
		modality: 'online',
		status: 'draft',
		tags: ['ai'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-03-02T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Retired Legacy Operations',
		summary: 'Historical operations course kept for audit reference.',
		modality: 'in-person',
		status: 'retired',
		tags: ['operations'],
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-02-01T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'Privacy Workshop',
		summary: 'Covers security reviews for data handling.',
		modality: 'online',
		status: 'active',
		tags: ['privacy'],
		createdAt: '2026-03-15T00:00:00.000Z',
		updatedAt: '2026-06-15T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Threat Modeling Workshop',
		summary: 'Facilitated modeling sessions for product teams.',
		modality: 'hybrid',
		status: 'active',
		tags: ['security'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-06-20T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Cloud Security Draft',
		summary: 'Draft notes for a cloud security clinic.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['security', 'cloud'],
		createdAt: '2026-04-15T00:00:00.000Z',
		updatedAt: '2026-04-16T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Retired Network Defense',
		summary: 'Retired introduction to network defense monitoring.',
		modality: 'online',
		status: 'retired',
		tags: ['security'],
		createdAt: '2026-01-20T00:00:00.000Z',
		updatedAt: '2026-03-01T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Accessibility for Engineers',
		summary: 'Practical accessibility reviews for product engineers.',
		modality: 'in-person',
		status: 'active',
		tags: ['accessibility'],
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-05-20T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'API Design Clinic',
		summary: 'Studio reviews of HTTP API shape and error contracts.',
		modality: 'online',
		status: 'active',
		tags: ['api'],
		createdAt: '2026-05-10T00:00:00.000Z',
		updatedAt: '2026-06-10T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Leadership for Tech Leads',
		summary: 'Retired seminar on technical leadership practices.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['leadership'],
		createdAt: '2026-06-01T00:00:00.000Z',
		updatedAt: '2026-06-02T00:00:00.000Z',
	},
];

if (seedCourses.length < 12 || new Set(seedCourses.map((course) => course.id)).size !== seedCourses.length) {
	throw new Error('Course seed must contain at least 12 courses with unique ids.');
}
if (new Set(seedCourses.map((course) => course.modality)).size !== 3 || new Set(seedCourses.map((course) => course.status)).size !== 3) {
	throw new Error('Course seed must include every modality and status.');
}

export function createCourseRepository(): CourseRepository {
	const courses = seedCourses.map(cloneCourse);
	return {
		list(): Promise<readonly Course[]> {
			return Promise.resolve(courses.map(cloneCourse));
		},
		findById(id: string): Promise<Course | undefined> {
			const course = courses.find((item) => item.id === id);
			return Promise.resolve(course === undefined ? undefined : cloneCourse(course));
		},
	};
}

export function createEnrollmentRequestRepository(): EnrollmentRequestRepository {
	const requests: EnrollmentRequest[] = [];
	let sequence = 1;
	return {
		list(): Promise<readonly EnrollmentRequest[]> {
			return Promise.resolve(requests.map(cloneEnrollment));
		},
		findById(id: string): Promise<EnrollmentRequest | undefined> {
			const request = requests.find((item) => item.id === id);
			return Promise.resolve(request === undefined ? undefined : cloneEnrollment(request));
		},
		insert(request: EnrollmentRequest): Promise<void> {
			requests.push(cloneEnrollment(request));
			return Promise.resolve();
		},
		replace(request: EnrollmentRequest): Promise<void> {
			const index = requests.findIndex((item) => item.id === request.id);
			if (index === -1) {
				return Promise.reject(new Error('Enrollment request not found.'));
			}
			requests[index] = cloneEnrollment(request);
			return Promise.resolve();
		},
		nextId(): string {
			const id = `enroll-${String(sequence).padStart(3, '0')}`;
			sequence += 1;
			return id;
		},
	};
}

function cloneCourse(course: Course): Course {
	return { ...course, tags: [...course.tags] };
}

function cloneEnrollment(request: EnrollmentRequest): EnrollmentRequest {
	return { ...request, statusHistory: request.statusHistory.map((entry) => ({ ...entry })) };
}
