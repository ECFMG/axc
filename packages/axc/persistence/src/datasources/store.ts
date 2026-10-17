import type { Catalog } from '@axc/domain';
export interface Store {
	courses: Catalog.Course.CourseEntityReference[];
	requests: Map<string, Catalog.EnrollmentRequest.EnrollmentRequestProps>;
	nextId: number;
	lock: Promise<void>;
}
const titles = [
	'AI Security Foundations',
	'Cloud Architecture',
	'Data Analysis',
	'Leadership Essentials',
	'Software Testing',
	'Product Strategy',
	'Secure Development',
	'Team Communication',
	'Machine Learning',
	'Network Fundamentals',
	'Project Planning',
	'Accessibility Design',
];
export function createStore(): Store {
	const courses: Catalog.Course.CourseEntityReference[] = titles.map((title, i) => ({
		id: `course-${String(i + 1).padStart(3, '0')}`,
		title,
		summary: i === 3 ? 'Mentorship techniques for new team leads.' : `${title} practical training for professionals.`,
		modality: (['online', 'in-person', 'hybrid'] as const)[i % 3] ?? 'online',
		status: (['active', 'draft', 'retired', 'active'] as const)[i % 4] ?? 'active',
		tags: i % 2 ? ['business', 'team'] : ['ai', 'security'],
		createdAt: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
		updatedAt: new Date(Date.UTC(2026, 5, i + 1)).toISOString(),
	}));
	return { courses, requests: new Map(), nextId: 1, lock: Promise.resolve() };
}
