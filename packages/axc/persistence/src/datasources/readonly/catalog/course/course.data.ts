import type { Catalog } from '@axc/domain';

export function courseFixtures(): Catalog.Course.Course[] {
	const titles = [
		'AI Security Foundations',
		'Cloud Architecture',
		'TypeScript Essentials',
		'Data Ethics',
		'Secure Coding',
		'Leadership Skills',
		'Machine Learning',
		'Project Planning',
		'Network Defense',
		'Accessibility Basics',
		'Incident Response',
		'API Design',
	];
	const modalities: Catalog.Course.CourseModality[] = ['online', 'in-person', 'hybrid'];
	const statuses: Catalog.Course.CourseStatus[] = ['active', 'draft', 'retired'];
	return titles.map((title, index) => ({
		id: `course-${String(index + 1).padStart(3, '0')}`,
		title,
		summary: `Training in ${title.toLowerCase()} for working professionals.`,
		modality: modalities[index % 3] ?? 'online',
		status: statuses[index % 3] ?? 'active',
		tags: index % 2 === 0 ? ['ai', 'security'] : ['professional', 'technology'],
		createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
		updatedAt: new Date(Date.UTC(2026, 5, index + 1)).toISOString(),
	}));
}
