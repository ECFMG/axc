import type { Course, CourseRepository } from '@axc/domain';
import { NotFoundError } from '@cellix/domain-seedwork/repository';

const courseFixtures: Course[] = [
	{
		id: 'course-001',
		title: 'AI Security Foundations',
		summary: 'Introductory course on secure AI-assisted development.',
		modality: 'online',
		status: 'active',
		tags: ['ai', 'security'],
		createdAt: '2026-01-15T00:00:00.000Z',
		updatedAt: '2026-06-12T00:00:00.000Z',
	},
	{
		id: 'course-002',
		title: 'Cloud Architecture',
		summary: 'Design resilient distributed platforms.',
		modality: 'hybrid',
		status: 'active',
		tags: ['cloud', 'architecture'],
		createdAt: '2026-01-16T00:00:00.000Z',
		updatedAt: '2026-06-11T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Data Engineering',
		summary: 'Build reliable data pipelines.',
		modality: 'online',
		status: 'active',
		tags: ['data', 'python'],
		createdAt: '2026-01-17T00:00:00.000Z',
		updatedAt: '2026-06-10T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Effective Leadership',
		summary: 'Coach and support successful teams.',
		modality: 'in-person',
		status: 'draft',
		tags: ['leadership'],
		createdAt: '2026-01-18T00:00:00.000Z',
		updatedAt: '2026-06-09T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Frontend Essentials',
		summary: 'Create accessible user interfaces.',
		modality: 'online',
		status: 'active',
		tags: ['web', 'accessibility'],
		createdAt: '2026-01-19T00:00:00.000Z',
		updatedAt: '2026-06-08T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'Legacy Systems',
		summary: 'Maintain older enterprise applications.',
		modality: 'in-person',
		status: 'retired',
		tags: ['legacy'],
		createdAt: '2026-01-20T00:00:00.000Z',
		updatedAt: '2026-06-07T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Machine Learning',
		summary: 'Train and evaluate predictive models.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['ai', 'data'],
		createdAt: '2026-01-21T00:00:00.000Z',
		updatedAt: '2026-06-06T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Network Defense',
		summary: 'Apply security controls to corporate networks.',
		modality: 'in-person',
		status: 'active',
		tags: ['networking'],
		createdAt: '2026-01-22T00:00:00.000Z',
		updatedAt: '2026-06-05T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Operations Workshop',
		summary: 'Practical incident response exercises.',
		modality: 'hybrid',
		status: 'active',
		tags: ['security', 'operations'],
		createdAt: '2026-01-23T00:00:00.000Z',
		updatedAt: '2026-06-04T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Python Basics',
		summary: 'Learn programming with hands-on examples.',
		modality: 'online',
		status: 'draft',
		tags: ['python'],
		createdAt: '2026-01-24T00:00:00.000Z',
		updatedAt: '2026-06-03T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Quality Engineering',
		summary: 'Test software and prevent regressions.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['testing'],
		createdAt: '2026-01-25T00:00:00.000Z',
		updatedAt: '2026-06-02T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Web Security',
		summary: 'Protect web applications from common attacks.',
		modality: 'online',
		status: 'retired',
		tags: ['web', 'security'],
		createdAt: '2026-01-26T00:00:00.000Z',
		updatedAt: '2026-06-01T00:00:00.000Z',
	},
];

/** Isolated local sample storage; callers receive copies, including tags. */
export function createCourseRepository(): CourseRepository {
	const records = new Map(courseFixtures.map((course) => [course.id, structuredClone(course)]));
	return {
		get(id) {
			const course = records.get(id);
			if (!course) return Promise.reject(new NotFoundError(`Course ${id} was not found.`));
			return Promise.resolve(structuredClone(course));
		},
		save(course) {
			records.set(course.id, structuredClone(course));
			return Promise.resolve(structuredClone(course));
		},
		list() {
			return Promise.resolve(structuredClone([...records.values()]));
		},
	};
}
