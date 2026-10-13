import type { Course } from '@axc/domain';

const course = (n: number, title: string, summary: string, modality: Course['modality'], status: Course['status'], tags: string[], createdAt: string, updatedAt: string): Course => ({
	id: `course-${String(n).padStart(3, '0')}`,
	title,
	summary,
	modality,
	status,
	tags,
	createdAt: `${createdAt}T00:00:00.000Z`,
	updatedAt: `${updatedAt}T00:00:00.000Z`,
});

/** Fixture catalog: 12 courses mixing every modality, status and several tags. */
export const COURSE_SEED: readonly Course[] = [
	course(1, 'AI Security Foundations', 'Introductory course on secure AI-assisted development.', 'online', 'active', ['ai', 'security'], '2026-01-15', '2026-06-01'),
	course(2, 'Secure Coding in TypeScript', 'Write TypeScript that resists common SECURITY flaws.', 'online', 'active', ['typescript'], '2026-02-01', '2026-02-10'),
	course(3, 'Cloud Architecture Workshop', 'Hands-on design of resilient cloud systems.', 'in-person', 'active', ['cloud', 'architecture'], '2025-11-20', '2026-03-05'),
	course(4, 'Prompt Engineering Basics', 'Getting reliable output from large language models.', 'online', 'draft', ['AI', 'llm'], '2026-04-02', '2026-04-02'),
	course(5, 'Threat Modeling Lab', 'Identify and rank threats against real applications.', 'hybrid', 'active', ['Security', 'design'], '2025-09-10', '2026-01-12'),
	course(6, 'Legacy Java Maintenance', 'Keeping older Java services alive.', 'in-person', 'retired', ['java'], '2024-05-01', '2025-01-01'),
	course(7, 'Data Privacy Essentials', 'Handling personal data responsibly.', 'online', 'retired', ['privacy', 'compliance'], '2024-08-15', '2025-06-30'),
	course(8, 'Machine Learning Operations', 'Shipping and monitoring ML models in production.', 'hybrid', 'active', ['ai', 'mlops'], '2026-03-18', '2026-05-22'),
	course(9, 'Agile Team Facilitation', 'Run effective ceremonies and retrospectives.', 'in-person', 'active', ['agile', 'leadership'], '2025-07-07', '2025-12-01'),
	course(10, 'Kubernetes for Developers', 'Deploying containerised workloads.', 'hybrid', 'draft', ['cloud', 'containers'], '2026-05-05', '2026-05-06'),
	course(11, 'Accessibility in Web Design', 'Building inclusive interfaces.', 'online', 'active', ['web', 'a11y'], '2025-10-01', '2026-02-20'),
	course(12, 'Zero Trust Networking', 'Network design that assumes breach.', 'in-person', 'draft', ['network', 'security'], '2026-06-10', '2026-06-11'),
];
