import type { Domain } from '@axc/domain';

type Course = Domain.Contexts.Catalog.Course.Course;
const seeds: [string, string, Course['modality'], Course['status'], string[]][] = [
	['AI Security Foundations', 'Introductory course on secure AI-assisted development.', 'online', 'active', ['ai', 'security']],
	['Cloud Architecture', 'Design resilient services.', 'hybrid', 'active', ['cloud']],
	['Secure Coding Workshop', 'Practical development skills.', 'in-person', 'active', ['security']],
	['Data Ethics', 'Responsible analytics and governance.', 'online', 'draft', ['data', 'ai']],
	['Legacy Systems', 'Maintain older platforms.', 'in-person', 'retired', ['maintenance']],
	['Testing Fundamentals', 'Automated quality practices.', 'online', 'active', ['testing']],
	['Incident Response', 'Respond to security incidents.', 'hybrid', 'active', ['operations']],
	['Accessibility', 'Build inclusive interfaces.', 'online', 'active', ['web']],
	['Leadership', 'Team collaboration skills.', 'in-person', 'draft', ['management']],
	['Machine Learning', 'Model development foundations.', 'hybrid', 'active', ['ai', 'data']],
	['Web Performance', 'Optimize web applications.', 'online', 'retired', ['web']],
	['API Design', 'Design service interfaces.', 'hybrid', 'active', ['architecture']],
];
export const courses: Course[] = seeds.map((row, index) => ({
	id: `course-${String(index + 1).padStart(3, '0')}`,
	title: row[0],
	summary: row[1],
	modality: row[2],
	status: row[3],
	tags: row[4],
	createdAt: `2026-${String(index + 1).padStart(2, '0')}-01T00:00:00.000Z`,
	updatedAt: `2026-${String(12 - index).padStart(2, '0')}-15T00:00:00.000Z`,
}));
