export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: 'online' | 'in-person' | 'hybrid';
	status: 'draft' | 'active' | 'retired';
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

export interface CourseSearch {
	q?: string | undefined;
	modality?: Course['modality'] | undefined;
	status?: Course['status'] | undefined;
	tag?: string | undefined;
	page: number;
	pageSize: number;
	sort: 'title' | 'createdAt' | 'updatedAt';
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

/** Fixed sample data; no external services or production data are needed. */
const catalog: Course[] = [
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
		title: 'Cloud Fundamentals',
		summary: 'Explore cloud security and deployment basics.',
		modality: 'hybrid',
		status: 'active',
		tags: ['cloud'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-04-01T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Defensive Programming',
		summary: 'Build resilient applications.',
		modality: 'in-person',
		status: 'draft',
		tags: ['Security', 'coding'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-05-01T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Applied AI',
		summary: 'Practice responsible machine learning.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['AI', 'data'],
		createdAt: '2026-01-02T00:00:00.000Z',
		updatedAt: '2026-07-01T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Legacy Networks',
		summary: 'Understand older network protocols.',
		modality: 'in-person',
		status: 'retired',
		tags: ['networking'],
		createdAt: '2025-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'Data Analysis',
		summary: 'Turn datasets into useful insights.',
		modality: 'online',
		status: 'active',
		tags: ['data', 'python'],
		createdAt: '2026-02-02T00:00:00.000Z',
		updatedAt: '2026-06-02T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Web Accessibility',
		summary: 'Design inclusive web experiences.',
		modality: 'online',
		status: 'draft',
		tags: ['web', 'design'],
		createdAt: '2026-03-02T00:00:00.000Z',
		updatedAt: '2026-05-02T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Leadership Workshop',
		summary: 'Communicate and coach effectively.',
		modality: 'in-person',
		status: 'active',
		tags: ['leadership'],
		createdAt: '2026-01-03T00:00:00.000Z',
		updatedAt: '2026-04-02T00:00:00.000Z',
	},
	{ id: 'course-009', title: 'Database Design', summary: 'Model relational data.', modality: 'hybrid', status: 'active', tags: ['data', 'sql'], createdAt: '2026-02-03T00:00:00.000Z', updatedAt: '2026-07-02T00:00:00.000Z' },
	{
		id: 'course-010',
		title: 'Classic Web Tools',
		summary: 'Maintain historical web applications.',
		modality: 'online',
		status: 'retired',
		tags: ['web'],
		createdAt: '2025-02-01T00:00:00.000Z',
		updatedAt: '2026-01-02T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Incident Response',
		summary: 'Investigate security incidents with AI tools.',
		modality: 'online',
		status: 'active',
		tags: ['security', 'ai'],
		createdAt: '2026-03-03T00:00:00.000Z',
		updatedAt: '2026-06-03T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Agile Delivery',
		summary: 'Improve team delivery practices.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['leadership', 'agile'],
		createdAt: '2025-03-01T00:00:00.000Z',
		updatedAt: '2026-01-03T00:00:00.000Z',
	},
];

export function searchCourses(query: CourseSearch): CoursePage {
	const q = query.q?.toLowerCase();
	const tag = query.tag?.toLowerCase();
	const matches = catalog.filter(
		(course) =>
			(!q || [course.title, course.summary, ...course.tags].some((text) => text.toLowerCase().includes(q))) &&
			(!query.modality || course.modality === query.modality) &&
			(!query.status || course.status === query.status) &&
			(!tag || course.tags.some((value) => value.toLowerCase() === tag)),
	);
	matches.sort((a, b) => a[query.sort].localeCompare(b[query.sort], 'en') || a.id.localeCompare(b.id, 'en'));
	const start = (query.page - 1) * query.pageSize;
	return {
		items: matches.slice(start, start + query.pageSize).map((course) => ({ ...course, tags: [...course.tags] })),
		page: query.page,
		pageSize: query.pageSize,
		totalItems: matches.length,
		totalPages: Math.ceil(matches.length / query.pageSize),
	};
}
