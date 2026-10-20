/** Read model for the local, read-only course catalog. */
export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: 'online' | 'in-person' | 'hybrid';
	status: 'draft' | 'active' | 'retired';
	tags: readonly string[];
	createdAt: string;
	updatedAt: string;
}

export interface CourseQuery {
	q?: string;
	modality?: Course['modality'];
	status?: Course['status'];
	tag?: string;
	page: number;
	pageSize: number;
	sort: 'title' | 'createdAt' | 'updatedAt';
}

export interface CoursePage {
	items: readonly Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

// Fixed fixtures keep tests independent of services, clocks and production data.
export const courses: readonly Readonly<Course>[] = Object.freeze(
	(
		[
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
				title: 'Urban Gardening',
				summary: 'Grow herbs and learn composting in small spaces.',
				modality: 'in-person',
				status: 'active',
				tags: ['sustainability', 'community'],
				createdAt: '2026-01-12T00:00:00.000Z',
				updatedAt: '2026-03-02T00:00:00.000Z',
			},
			{
				id: 'course-003',
				title: 'Web Accessibility',
				summary: 'Make digital experiences work for everyone.',
				modality: 'hybrid',
				status: 'active',
				tags: ['design', 'WCAG'],
				createdAt: '2026-01-03T00:00:00.000Z',
				updatedAt: '2026-03-18T00:00:00.000Z',
			},
			{
				id: 'course-004',
				title: 'Intro to Pottery',
				summary: 'Shape clay using hand-building techniques.',
				modality: 'in-person',
				status: 'draft',
				tags: ['art', 'hands-on'],
				createdAt: '2026-02-14T00:00:00.000Z',
				updatedAt: '2026-03-08T00:00:00.000Z',
			},
			{
				id: 'course-005',
				title: 'Data Storytelling',
				summary: 'Turn numerical findings into clear visual explanations.',
				modality: 'online',
				status: 'active',
				tags: ['data', 'communication'],
				createdAt: '2026-01-25T00:00:00.000Z',
				updatedAt: '2026-04-06T00:00:00.000Z',
			},
			{
				id: 'course-006',
				title: 'Project Leadership',
				summary: 'Coordinate teams, milestones and practical delivery plans.',
				modality: 'hybrid',
				status: 'retired',
				tags: ['management', 'communication'],
				createdAt: '2025-12-10T00:00:00.000Z',
				updatedAt: '2026-02-20T00:00:00.000Z',
			},
			{
				id: 'course-007',
				title: 'Conversational Spanish',
				summary: 'Practice everyday dialogue and listening skills.',
				modality: 'in-person',
				status: 'active',
				tags: ['language', 'beginner'],
				createdAt: '2026-02-02T00:00:00.000Z',
				updatedAt: '2026-04-04T00:00:00.000Z',
			},
			{
				id: 'course-008',
				title: 'Cybersecurity Basics',
				summary: 'Recognize common threats and protect personal devices.',
				modality: 'online',
				status: 'draft',
				tags: ['security', 'technology'],
				createdAt: '2026-02-20T00:00:00.000Z',
				updatedAt: '2026-04-03T00:00:00.000Z',
			},
			{
				id: 'course-009',
				title: 'Photography Fieldwork',
				summary: 'Explore composition and natural light through guided practice.',
				modality: 'hybrid',
				status: 'active',
				tags: ['art', 'photography'],
				createdAt: '2026-02-05T00:00:00.000Z',
				updatedAt: '2026-03-25T00:00:00.000Z',
			},
			{
				id: 'course-010',
				title: 'Mindful Movement',
				summary: 'Combine gentle activity with focused breathing.',
				modality: 'in-person',
				status: 'retired',
				tags: ['wellness', 'beginner'],
				createdAt: '2025-12-21T00:00:00.000Z',
				updatedAt: '2026-02-25T00:00:00.000Z',
			},
			{
				id: 'course-011',
				title: 'Python for Analysts',
				summary: 'Analyze tables and automate repeatable reports.',
				modality: 'online',
				status: 'active',
				tags: ['data', 'technology'],
				createdAt: '2026-03-01T00:00:00.000Z',
				updatedAt: '2026-04-01T00:00:00.000Z',
			},
			{
				id: 'course-012',
				title: 'Responsible Automation',
				summary: 'Compare security controls for automated systems.',
				modality: 'hybrid',
				status: 'draft',
				tags: ['ai', 'science'],
				createdAt: '2026-03-10T00:00:00.000Z',
				updatedAt: '2026-04-07T00:00:00.000Z',
			},
		] satisfies Course[]
	).map((course) => Object.freeze({ ...course, tags: Object.freeze(course.tags) })),
);

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function searchCourses(query: CourseQuery, catalog: readonly Course[] = courses): CoursePage {
	const q = query.q?.trim().toLowerCase() ?? '';
	const tag = query.tag?.trim().toLowerCase();
	// ponytail: linear scan suits this fixed catalog; use indexed persistence when the catalog grows.
	const matches = catalog.filter(
		(course) =>
			(!query.modality || course.modality === query.modality) &&
			(!query.status || course.status === query.status) &&
			(tag === undefined || course.tags.some((value) => value.toLowerCase() === tag)) &&
			(!q || [course.title, course.summary, ...course.tags].some((value) => value.toLowerCase().includes(q))),
	);
	matches.sort((a, b) => compare(query.sort === 'title' ? a.title.toLowerCase() : a[query.sort], query.sort === 'title' ? b.title.toLowerCase() : b[query.sort]) || compare(a.id, b.id));
	const totalItems = matches.length;
	const totalPages = Math.ceil(totalItems / query.pageSize);
	const start = query.page > totalPages ? totalItems : (query.page - 1) * query.pageSize;
	return { items: matches.slice(start, start + query.pageSize), page: query.page, pageSize: query.pageSize, totalItems, totalPages };
}
