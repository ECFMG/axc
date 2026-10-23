import type { CatalogStore, Course, EnrollmentRequest } from '@axc/domain';

export interface MemoryCatalogOptions {
	now?: () => string;
	nextEnrollmentId?: () => string;
}

const SEED_COURSES = [
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
		summary: 'Hands-on practice for defensive operations.',
		modality: 'in-person',
		status: 'active',
		tags: ['security', 'operations'],
		createdAt: '2026-02-02T00:00:00.000Z',
		updatedAt: '2026-06-02T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Cloud Architecture',
		summary: 'Includes a security review of shared responsibility.',
		modality: 'online',
		status: 'active',
		tags: ['cloud'],
		createdAt: '2026-03-03T00:00:00.000Z',
		updatedAt: '2026-06-03T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Data Privacy Basics',
		summary: 'Practical privacy controls for product teams.',
		modality: 'hybrid',
		status: 'active',
		tags: ['privacy'],
		createdAt: '2026-04-04T00:00:00.000Z',
		updatedAt: '2026-06-04T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'AI for Analysts',
		summary: 'Draft workshop on applied machine learning.',
		modality: 'online',
		status: 'draft',
		tags: ['ai', 'analytics'],
		createdAt: '2026-01-20T00:00:00.000Z',
		updatedAt: '2026-05-05T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'Legacy Mainframe Skills',
		summary: 'Retired curriculum for legacy systems.',
		modality: 'in-person',
		status: 'retired',
		tags: ['legacy'],
		createdAt: '2026-01-10T00:00:00.000Z',
		updatedAt: '2026-04-06T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Hybrid Leadership Studio',
		summary: 'Facilitation practice for hybrid teams.',
		modality: 'hybrid',
		status: 'active',
		tags: ['leadership'],
		createdAt: '2026-05-07T00:00:00.000Z',
		updatedAt: '2026-06-07T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Online Writing Lab',
		summary: 'Retired writing studio.',
		modality: 'online',
		status: 'retired',
		tags: ['writing'],
		createdAt: '2026-02-08T00:00:00.000Z',
		updatedAt: '2026-03-08T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Incident Response',
		summary: 'Response drills for on-call teams.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['security', 'incident'],
		createdAt: '2026-03-09T00:00:00.000Z',
		updatedAt: '2026-05-09T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'In-Person Facilitation',
		summary: 'Classroom facilitation practice.',
		modality: 'in-person',
		status: 'active',
		tags: ['teaching'],
		createdAt: '2026-04-10T00:00:00.000Z',
		updatedAt: '2026-06-10T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Platform Engineering',
		summary: 'Internal platform delivery for product teams.',
		modality: 'online',
		status: 'active',
		tags: ['platform', 'ai'],
		createdAt: '2026-05-11T00:00:00.000Z',
		updatedAt: '2026-07-11T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Records Management',
		summary: 'Retired records curriculum.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['compliance'],
		createdAt: '2026-06-12T00:00:00.000Z',
		updatedAt: '2026-06-12T00:00:00.000Z',
	},
] satisfies readonly Course[];

/** Process-local catalog. Data lives until the API process stops. */
export function createMemoryCatalog(options?: MemoryCatalogOptions): CatalogStore {
	const courses = SEED_COURSES.map(copyCourse);
	const requests: EnrollmentRequest[] = [];
	let sequence = 1;
	const now = options?.now ?? (() => new Date().toISOString());
	const nextEnrollmentId =
		options?.nextEnrollmentId ??
		(() => {
			const id = `enroll-${String(sequence).padStart(3, '0')}`;
			sequence += 1;
			return id;
		});

	return {
		listCourses: () => courses.map(copyCourse),
		findCourseById: (id) => {
			const course = courses.find((item) => item.id === id);
			return course === undefined ? undefined : copyCourse(course);
		},
		listEnrollmentRequests: () => requests.map(copyEnrollmentRequest),
		findEnrollmentRequestById: (id) => {
			const request = requests.find((item) => item.id === id);
			return request === undefined ? undefined : copyEnrollmentRequest(request);
		},
		addEnrollmentRequest: (request) => {
			requests.push(copyEnrollmentRequest(request));
		},
		replaceEnrollmentRequest: (request) => {
			const index = requests.findIndex((item) => item.id === request.id);
			if (index < 0) {
				throw new Error(`Enrollment request ${request.id} is not in the catalog.`);
			}
			requests[index] = copyEnrollmentRequest(request);
		},
		now,
		nextEnrollmentId,
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

function copyEnrollmentRequest(request: EnrollmentRequest): EnrollmentRequest {
	return {
		id: request.id,
		courseId: request.courseId,
		learnerEmail: request.learnerEmail,
		justification: request.justification,
		status: request.status,
		createdAt: request.createdAt,
		updatedAt: request.updatedAt,
		statusHistory: request.statusHistory.map((entry) => ({
			fromStatus: entry.fromStatus,
			toStatus: entry.toStatus,
			changedAt: entry.changedAt,
			changedBy: entry.changedBy,
			reason: entry.reason,
		})),
	};
}
