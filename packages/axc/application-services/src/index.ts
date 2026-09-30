export const HEALTH_SERVICE_NAME = 'agentCourses-api' as const;
export const HEALTH_PROJECT_CODE = 'axc' as const;
export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;
export const COURSE_SORTS = ['title', 'createdAt', 'updatedAt'] as const;

export type CourseModality = (typeof COURSE_MODALITIES)[number];
export type CourseStatus = (typeof COURSE_STATUSES)[number];
export type CourseSort = (typeof COURSE_SORTS)[number];

export type HealthEnvironment = 'local' | 'test' | 'production';

export interface HealthStatus {
	status: 'ok';
	service: typeof HEALTH_SERVICE_NAME;
	projectCode: typeof HEALTH_PROJECT_CODE;
	environment: HealthEnvironment;
	timestamp: string;
}

export interface ApiContext {
	environment: HealthEnvironment;
}

export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: CourseModality;
	status: CourseStatus;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

export interface CourseSearchQuery {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page?: number;
	pageSize?: number;
	sort?: CourseSort;
}

export interface CourseSearchResult {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface ApplicationServices {
	health: {
		getStatus(): HealthStatus;
	};
	courses: {
		search(query?: CourseSearchQuery): Promise<CourseSearchResult>;
	};
}

export interface ApplicationServicesFactory {
	forRequest(rawAuthHeader?: string): Promise<ApplicationServices>;
}

const COURSE_FIXTURES: readonly Course[] = [
	{
		id: 'course-008',
		title: 'Intro to Machine Learning',
		summary: 'Build a practical foundation in supervised learning and responsible AI.',
		modality: 'online',
		status: 'draft',
		tags: ['ai', 'machine-learning'],
		createdAt: '2026-02-18T00:00:00.000Z',
		updatedAt: '2026-07-11T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Classroom Facilitation Essentials',
		summary: 'Practice inclusive techniques for leading effective in-person learning.',
		modality: 'in-person',
		status: 'active',
		tags: ['leadership', 'teaching'],
		createdAt: '2025-09-05T00:00:00.000Z',
		updatedAt: '2026-04-14T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Secure Coding Lab',
		summary: 'Hands-on defensive development techniques for modern web applications.',
		modality: 'hybrid',
		status: 'active',
		tags: ['application-security', 'development'],
		createdAt: '2026-04-09T00:00:00.000Z',
		updatedAt: '2026-08-19T00:00:00.000Z',
	},
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
		id: 'course-010',
		title: 'Legacy Systems Modernization',
		summary: 'Plan safe incremental modernization of long-lived enterprise systems.',
		modality: 'in-person',
		status: 'retired',
		tags: ['architecture', 'modernization'],
		createdAt: '2024-06-12T00:00:00.000Z',
		updatedAt: '2025-12-18T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'DevOps Bootcamp',
		summary: 'Connect delivery automation, observability, and cloud operations.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['devops', 'cloud'],
		createdAt: '2026-03-02T00:00:00.000Z',
		updatedAt: '2026-05-20T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Web Accessibility Essentials',
		summary: 'Create inclusive interfaces using practical accessibility standards.',
		modality: 'online',
		status: 'active',
		tags: ['accessibility', 'frontend'],
		createdAt: '2026-05-23T00:00:00.000Z',
		updatedAt: '2026-09-03T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'Effective Technical Writing',
		summary: 'Write clear documentation for technical and non-technical readers.',
		modality: 'online',
		status: 'active',
		tags: ['communication', 'writing'],
		createdAt: '2025-11-17T00:00:00.000Z',
		updatedAt: '2026-03-07T00:00:00.000Z',
	},
	{
		id: 'course-002',
		title: 'Advanced Cloud Architecture',
		summary: 'Design resilient distributed workloads across cloud environments.',
		modality: 'hybrid',
		status: 'active',
		tags: ['cloud', 'architecture'],
		createdAt: '2025-10-10T00:00:00.000Z',
		updatedAt: '2026-06-28T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Leadership for Engineering Managers',
		summary: 'Coach teams and make sound decisions in complex environments.',
		modality: 'hybrid',
		status: 'active',
		tags: ['leadership', 'management'],
		createdAt: '2026-01-29T00:00:00.000Z',
		updatedAt: '2026-07-25T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Data Privacy Fundamentals',
		summary: 'Learn practical security and privacy controls for sensitive data.',
		modality: 'online',
		status: 'active',
		tags: ['compliance', 'privacy'],
		createdAt: '2025-12-08T00:00:00.000Z',
		updatedAt: '2026-02-16T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Incident Response Workshop',
		summary: 'Coordinate investigation, containment, and recovery during incidents.',
		modality: 'in-person',
		status: 'retired',
		tags: ['security', 'operations'],
		createdAt: '2024-11-21T00:00:00.000Z',
		updatedAt: '2026-01-09T00:00:00.000Z',
	},
];

function copyCourse(course: Course): Course {
	return { ...course, tags: [...course.tags] };
}

export function resolveEnvironment(nodeEnv: string | undefined): HealthEnvironment {
	if (nodeEnv === 'production') {
		return 'production';
	}
	if (nodeEnv === 'test') {
		return 'test';
	}
	return 'local';
}

export function buildApplicationServicesFactory(context: ApiContext): ApplicationServicesFactory {
	const forRequest = (): Promise<ApplicationServices> =>
		Promise.resolve({
			health: {
				getStatus(): HealthStatus {
					return {
						status: 'ok',
						service: HEALTH_SERVICE_NAME,
						projectCode: HEALTH_PROJECT_CODE,
						environment: context.environment,
						timestamp: new Date().toISOString(),
					};
				},
			},
			courses: {
				search(query: CourseSearchQuery = {}): Promise<CourseSearchResult> {
					const page = query.page ?? 1;
					const pageSize = query.pageSize ?? 10;
					const sort = query.sort ?? 'title';
					const keyword = query.q?.trim().toLowerCase();
					const tag = query.tag?.trim().toLowerCase();
					const courses = COURSE_FIXTURES.map(copyCourse);
					const filtered = courses.filter((course) => {
						if (query.modality !== undefined && course.modality !== query.modality) {
							return false;
						}
						if (query.status !== undefined && course.status !== query.status) {
							return false;
						}
						if (tag !== undefined && !course.tags.some((courseTag) => courseTag.toLowerCase() === tag)) {
							return false;
						}
						if (keyword !== undefined) {
							const keywordFields = [course.title, course.summary, ...course.tags];
							return keywordFields.some((field) => field.toLowerCase().includes(keyword));
						}
						return true;
					});
					const sorted = [...filtered].sort((left, right) => {
						const leftValue = sort === 'title' ? left.title.toLowerCase() : left[sort];
						const rightValue = sort === 'title' ? right.title.toLowerCase() : right[sort];
						if (leftValue < rightValue) {
							return -1;
						}
						if (leftValue > rightValue) {
							return 1;
						}
						return left.id.localeCompare(right.id);
					});
					const totalItems = sorted.length;
					const offset = (page - 1) * pageSize;
					return Promise.resolve({
						items: sorted.slice(offset, offset + pageSize),
						page,
						pageSize,
						totalItems,
						totalPages: Math.ceil(totalItems / pageSize),
					});
				},
			},
		});

	return { forRequest };
}
