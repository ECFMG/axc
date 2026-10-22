import { Types } from 'mongoose';
import type { ModelsContext } from '../models/index.ts';

// Deterministic ids and dates so local runs, docs examples, and acceptance tests see the same catalog.
// Mix: 7 active, 4 retired, 3 draft; 7 online, 4 in-person, 3 hybrid.
const courses = [
	{ n: 1, title: 'AI Security Foundations', summary: 'Introductory course on secure AI-assisted development.', modality: 'online', status: 'active', tags: ['ai', 'security'], createdAt: '2026-01-15', updatedAt: '2026-06-01' },
	{
		n: 2,
		title: 'Secure Coding in TypeScript',
		summary: 'Input validation, injection defenses, and dependency hygiene for TypeScript services.',
		modality: 'online',
		status: 'active',
		tags: ['typescript', 'security'],
		createdAt: '2026-02-03',
		updatedAt: '2026-05-12',
	},
	{ n: 3, title: 'Prompt Engineering Workshop', summary: 'Hands-on prompt design for coding agents.', modality: 'in-person', status: 'active', tags: ['ai', 'agents'], createdAt: '2026-03-10', updatedAt: '2026-03-20' },
	{
		n: 4,
		title: 'Cloud Architecture Basics',
		summary: 'Core building blocks of cloud-hosted applications.',
		modality: 'hybrid',
		status: 'active',
		tags: ['cloud', 'architecture'],
		createdAt: '2025-11-01',
		updatedAt: '2026-04-15',
	},
	{
		n: 5,
		title: 'Domain-Driven Design Essentials',
		summary: 'Aggregates, bounded contexts, and ubiquitous language in practice.',
		modality: 'online',
		status: 'active',
		tags: ['architecture', 'ddd'],
		createdAt: '2025-09-22',
		updatedAt: '2026-02-28',
	},
	{
		n: 6,
		title: 'Behavior-Driven Development with Cucumber',
		summary: 'Writing executable specifications with Gherkin and Serenity.',
		modality: 'in-person',
		status: 'active',
		tags: ['testing', 'bdd'],
		createdAt: '2026-04-05',
		updatedAt: '2026-04-05',
	},
	{ n: 7, title: 'Threat Modeling for Teams', summary: 'STRIDE-based threat modeling for product teams.', modality: 'hybrid', status: 'active', tags: ['security', 'process'], createdAt: '2026-05-18', updatedAt: '2026-06-10' },
	{
		n: 8,
		title: 'Legacy Monolith Maintenance',
		summary: 'Keeping an aging monolith healthy while it is replaced.',
		modality: 'in-person',
		status: 'retired',
		tags: ['architecture', 'legacy'],
		createdAt: '2024-06-01',
		updatedAt: '2025-01-10',
	},
	{ n: 9, title: 'Introduction to Machine Learning', summary: 'Supervised learning fundamentals and model evaluation.', modality: 'online', status: 'retired', tags: ['ai', 'ml'], createdAt: '2024-09-15', updatedAt: '2025-08-30' },
	{
		n: 10,
		title: 'Agentic Coding Harnesses',
		summary: 'Designing guardrails, hooks, and quality gates for coding agents.',
		modality: 'online',
		status: 'draft',
		tags: ['ai', 'agents', 'quality'],
		createdAt: '2026-06-20',
		updatedAt: '2026-06-25',
	},
	{
		n: 11,
		title: 'Accessible Web Interfaces',
		summary: 'WCAG-driven design and testing for web applications.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['accessibility', 'frontend'],
		createdAt: '2026-06-01',
		updatedAt: '2026-06-02',
	},
	{
		n: 12,
		title: 'Database Security Hardening',
		summary: 'Least privilege, encryption, and auditing for operational databases.',
		modality: 'online',
		status: 'retired',
		tags: ['security', 'databases'],
		createdAt: '2025-03-12',
		updatedAt: '2025-12-01',
	},
	{
		n: 13,
		title: 'Observability and Incident Response',
		summary: 'Logs, metrics, traces, and on-call practices.',
		modality: 'in-person',
		status: 'retired',
		tags: ['operations', 'cloud'],
		createdAt: '2025-02-14',
		updatedAt: '2025-10-20',
	},
	{ n: 14, title: 'Mentoring Junior Engineers', summary: 'Structured pairing and feedback for growing engineers.', modality: 'online', status: 'draft', tags: ['leadership'], createdAt: '2026-07-01', updatedAt: '2026-07-01' },
] as const;

/** Seed course ids are 24-hex ObjectIds ending in the course number, e.g. course 1 is 650000000000000000000001. */
const seedCourseId = (n: number): string => `65${String(n).padStart(22, '0')}`;

export async function seedCourses(models: ModelsContext): Promise<void> {
	if ((await models.Course.countDocuments().exec()) > 0) {
		return;
	}
	// Timestamps are part of the fixture, so mongoose must not overwrite them on insert.
	await models.Course.bulkWrite(
		courses.map(({ n, createdAt, updatedAt, tags, ...course }) => ({
			insertOne: { document: { ...course, _id: new Types.ObjectId(seedCourseId(n)), tags: [...tags], createdAt: new Date(`${createdAt}T00:00:00.000Z`), updatedAt: new Date(`${updatedAt}T00:00:00.000Z`) } },
		})),
		{ timestamps: false },
	);
}
