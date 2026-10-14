export type CourseModality = 'online' | 'in-person' | 'hybrid';
export type CourseStatus = 'draft' | 'active' | 'retired';
export type CourseSort = 'title' | 'createdAt' | 'updatedAt';

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

export interface CourseQuery {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSort;
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

// Deterministic sample catalog; no production data or external services.
const seeds: [string, string, CourseModality, CourseStatus, string[]][] = [
	['AI Security Foundations', 'Secure AI-assisted development.', 'online', 'active', ['ai', 'security']],
	['Cloud Architecture', 'Design resilient distributed systems.', 'hybrid', 'active', ['cloud', 'architecture']],
	['Data Privacy Workshop', 'Apply security controls to personal data.', 'in-person', 'active', ['privacy', 'data']],
	['TypeScript Basics', 'Build typed JavaScript applications.', 'online', 'active', ['typescript', 'development']],
	['Advanced AI', 'Explore intelligent systems.', 'hybrid', 'draft', ['ai', 'research']],
	['Network Operations', 'Maintain enterprise connectivity.', 'in-person', 'retired', ['network', 'operations']],
	['Threat Modeling', 'Identify and prioritize application risks.', 'online', 'active', ['security', 'design']],
	['Accessible Interfaces', 'Create inclusive web experiences.', 'hybrid', 'active', ['accessibility', 'design']],
	['Legacy Systems', 'Maintain older platforms.', 'online', 'retired', ['legacy', 'operations']],
	['Machine Learning Lab', 'Train predictive models.', 'in-person', 'draft', ['ai', 'data']],
	['Secure Delivery', 'Improve release pipelines.', 'hybrid', 'active', ['security', 'development']],
	['AI Governance', 'Manage responsible adoption and oversight.', 'online', 'draft', ['ai', 'governance']],
];

const catalog: Course[] = seeds.map((row, index) => ({
	id: `course-${String(index + 1).padStart(3, '0')}`,
	title: row[0],
	summary: row[1],
	modality: row[2],
	status: row[3],
	tags: row[4],
	createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
	updatedAt: new Date(Date.UTC(2026, 5, 12 - index)).toISOString(),
}));

export function searchCourses(query: CourseQuery): CoursePage {
	const keyword = query.q?.toLowerCase();
	const tag = query.tag?.toLowerCase();
	const matches = catalog.filter(
		(course) =>
			(!keyword || [course.title, course.summary, ...course.tags].some((text) => text.toLowerCase().includes(keyword))) &&
			(!query.modality || course.modality === query.modality) &&
			(!query.status || course.status === query.status) &&
			(!tag || course.tags.some((value) => value.toLowerCase() === tag)),
	);
	matches.sort((a, b) => {
		const left = a[query.sort];
		const right = b[query.sort];
		return (left < right ? -1 : left > right ? 1 : 0) || a.id.localeCompare(b.id);
	});
	const start = (query.page - 1) * query.pageSize;
	return {
		items: matches.slice(start, start + query.pageSize).map((course) => ({ ...course, tags: [...course.tags] })),
		page: query.page,
		pageSize: query.pageSize,
		totalItems: matches.length,
		totalPages: Math.ceil(matches.length / query.pageSize),
	};
}
