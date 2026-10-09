import type { Course, EnrollmentRequest } from '@axc/domain';

const date = (day: number) => `2026-01-${String(day).padStart(2, '0')}T00:00:00.000Z`;
const titles = [
	['AI Security Foundations', 'Secure AI-assisted development', 'online', 'active', 'ai,security'],
	['Cloud Architecture', 'Design cloud systems', 'hybrid', 'active', 'cloud,architecture'],
	['Product Discovery', 'Research user needs', 'in-person', 'draft', 'product,research'],
	['Data Ethics', 'Responsible data use', 'online', 'active', 'data,ethics'],
	['Secure APIs', 'API security practices', 'online', 'active', 'security,api'],
	['Team Leadership', 'Lead technical teams', 'in-person', 'retired', 'leadership'],
	['Machine Learning', 'Practical model design', 'hybrid', 'active', 'ai,data'],
	['Accessibility', 'Inclusive interfaces', 'online', 'draft', 'design'],
	['DevOps Basics', 'Delivery pipelines', 'hybrid', 'active', 'devops'],
	['Threat Modeling', 'Identify security risks', 'in-person', 'active', 'security'],
	['Technical Writing', 'Clear documentation', 'online', 'retired', 'writing'],
	['Database Design', 'Model persistent data', 'hybrid', 'active', 'data'],
] as const;
export interface Store {
	courses: Course[];
	requests: Map<string, EnrollmentRequest>;
	nextId: number;
	queue: Promise<unknown>;
}
export const createStore = (): Store => ({
	courses: titles.map(([title, summary, modality, status, tags], index) => ({
		id: `course-${String(index + 1).padStart(3, '0')}`,
		title,
		summary,
		modality,
		status,
		tags: tags.split(','),
		createdAt: date(index + 1),
		updatedAt: date(index + 1),
	})),
	requests: new Map(),
	nextId: 1,
	queue: Promise.resolve(),
});
export const cloneRequest = (request: EnrollmentRequest): EnrollmentRequest => ({
	...request,
	statusHistory: request.statusHistory.map((entry) => ({ ...entry })),
});
