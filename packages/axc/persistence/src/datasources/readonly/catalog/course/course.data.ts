import type { Domain } from '@axc/domain';

type Course = Domain.Contexts.Catalog.Course;
export const courses: Course[] = Array.from({ length: 12 }, (_, i) => ({
	id: `course-${String(i + 1).padStart(3, '0')}`,
	title:
		[
			'AI Security Foundations',
			'Cloud Architecture',
			'Secure Coding',
			'Data Engineering',
			'AI Ethics',
			'Testing Systems',
			'Threat Modeling',
			'Web Accessibility',
			'Leadership',
			'Incident Response',
			'Machine Learning',
			'DevOps Practices',
		][i] ?? '',
	summary: i === 1 ? 'Build security into cloud infrastructure.' : 'Practical training for modern development teams.',
	modality: (['online', 'in-person', 'hybrid'] as const)[i % 3] ?? 'online',
	status: i === 10 ? 'draft' : i === 11 ? 'retired' : 'active',
	tags: i % 2 === 0 ? ['ai', 'security'] : ['engineering'],
	createdAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
	updatedAt: `2026-06-${String(12 - i).padStart(2, '0')}T00:00:00.000Z`,
}));
