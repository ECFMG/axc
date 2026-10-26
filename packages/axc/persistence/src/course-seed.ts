import type { CourseProps } from '@axc/domain';

const at = (day: number) => `2026-01-${String(day).padStart(2, '0')}T09:00:00.000Z`;

/** Fixture catalog: 12 courses mixing every modality, status and several tags. */
export const courseSeed: readonly CourseProps[] = [
	{
		id: 'course-001',
		title: 'Secure Development Fundamentals',
		summary: 'Core secure coding practices for web services.',
		modality: 'online',
		status: 'active',
		tags: ['security', 'development'],
		createdAt: at(3),
		updatedAt: at(20),
	},
	{ id: 'course-002', title: 'Applied Machine Learning', summary: 'Hands-on model building and evaluation.', modality: 'hybrid', status: 'active', tags: ['ai', 'data'], createdAt: at(5), updatedAt: at(6) },
	{ id: 'course-003', title: 'AI Security Essentials', summary: 'Threats and defenses for AI systems.', modality: 'online', status: 'active', tags: ['ai', 'security'], createdAt: at(1), updatedAt: at(25) },
	{ id: 'course-004', title: 'Leadership Workshop', summary: 'Facilitated in-room leadership practice.', modality: 'in-person', status: 'active', tags: ['leadership'], createdAt: at(8), updatedAt: at(9) },
	{ id: 'course-005', title: 'Cloud Architecture Draft', summary: 'Designing resilient cloud systems.', modality: 'online', status: 'draft', tags: ['cloud', 'architecture'], createdAt: at(10), updatedAt: at(11) },
	{ id: 'course-006', title: 'Legacy Mainframe Operations', summary: 'Operating classic mainframe workloads.', modality: 'in-person', status: 'retired', tags: ['operations'], createdAt: at(2), updatedAt: at(4) },
	{ id: 'course-007', title: 'Data Privacy Basics', summary: 'Handling personal data responsibly and securely.', modality: 'online', status: 'active', tags: ['privacy', 'compliance'], createdAt: at(12), updatedAt: at(13) },
	{ id: 'course-008', title: 'Incident Response Lab', summary: 'Simulated security incidents in a lab setting.', modality: 'in-person', status: 'active', tags: ['security', 'operations'], createdAt: at(14), updatedAt: at(15) },
	{ id: 'course-009', title: 'Prompt Engineering', summary: 'Working effectively with large language models.', modality: 'hybrid', status: 'draft', tags: ['ai'], createdAt: at(16), updatedAt: at(17) },
	{ id: 'course-010', title: 'Agile Delivery', summary: 'Iterative planning and delivery for teams.', modality: 'hybrid', status: 'active', tags: ['process', 'leadership'], createdAt: at(18), updatedAt: at(19) },
	{ id: 'course-011', title: 'Network Defense', summary: 'Perimeter and zero-trust network design.', modality: 'online', status: 'retired', tags: ['security', 'network'], createdAt: at(6), updatedAt: at(7) },
	{ id: 'course-012', title: 'Technical Writing', summary: 'Clear documentation for engineers.', modality: 'online', status: 'active', tags: ['communication'], createdAt: at(21), updatedAt: at(22) },
];
