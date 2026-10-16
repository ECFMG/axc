import type { Course } from './course.read-repository.ts';

const descriptions = [
	['AI Security Foundations', 'Introductory course on secure AI-assisted development.', 'online', 'active', ['ai', 'security']],
	['Cloud Architecture', 'Cloud design essentials.', 'hybrid', 'active', ['cloud', 'architecture']],
	['Secure Coding', 'Write resilient software.', 'online', 'active', ['security', 'coding']],
	['Data Engineering', 'Build reliable data pipelines.', 'in-person', 'active', ['data']],
	['Practical AI', 'Apply AI techniques.', 'online', 'active', ['ai']],
	['Leadership Skills', 'Lead effective teams.', 'hybrid', 'active', ['leadership']],
	['Project Planning', 'Plan complex work.', 'in-person', 'draft', ['management']],
	['Legacy Systems', 'Maintain older systems.', 'online', 'retired', ['coding']],
	['Network Security', 'Defend network services.', 'hybrid', 'active', ['security']],
	['Database Basics', 'Learn data storage.', 'online', 'draft', ['data']],
	['Product Design', 'Design useful products.', 'in-person', 'active', ['design']],
	['Advanced Testing', 'Test distributed systems.', 'online', 'retired', ['testing']],
] as const;
export const courses: readonly Course[] = descriptions.map(([title, summary, modality, status, tags], index) => ({
	id: `course-${String(index + 1).padStart(3, '0')}`,
	title,
	summary,
	modality,
	status,
	tags,
	createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
	updatedAt: new Date(Date.UTC(2026, 5, index + 1)).toISOString(),
}));
