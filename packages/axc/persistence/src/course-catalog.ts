import { Course, type CourseProps, type CourseRepository } from '@axc/domain';
import { NotFoundError } from '@cellix/domain-seedwork/repository';

/** Local catalog fixture. Mixed modality, status, and tags for search tests. */
export const COURSE_SEED: readonly CourseProps[] = [
	{
		id: 'course-001',
		title: 'AI Security Foundations',
		summary: 'Introductory course on secure AI-assisted development.',
		modality: 'online',
		status: 'active',
		tags: ['ai', 'security'],
		createdAt: '2026-01-15T00:00:00.000Z',
		updatedAt: '2026-06-01T00:00:00.000Z',
	},
	{
		id: 'course-002',
		title: 'Secure Coding Lab',
		summary: 'Hands-on security exercises for application teams.',
		modality: 'in-person',
		status: 'active',
		tags: ['security', 'coding'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-05-01T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Platform Reliability',
		summary: 'Operating hybrid training platforms.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['reliability'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-03-15T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Classroom Facilitation',
		summary: 'In-person facilitation techniques.',
		modality: 'in-person',
		status: 'retired',
		tags: ['teaching'],
		createdAt: '2025-11-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Data Privacy Basics',
		summary: 'Privacy principles for course authors.',
		modality: 'online',
		status: 'draft',
		tags: ['privacy'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-02T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'Hybrid Workshop Design',
		summary: 'Design workshops that blend rooms and video.',
		modality: 'hybrid',
		status: 'active',
		tags: ['design', 'ai'],
		createdAt: '2026-01-20T00:00:00.000Z',
		updatedAt: '2026-07-01T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Incident Response',
		summary: 'Security drills for responders.',
		modality: 'online',
		status: 'retired',
		tags: ['operations'],
		createdAt: '2025-12-01T00:00:00.000Z',
		updatedAt: '2026-02-01T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Leadership Studio',
		summary: 'Coaching for engineering managers.',
		modality: 'in-person',
		status: 'draft',
		tags: ['leadership'],
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-05-02T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Accessibility Review',
		summary: 'Making learning content accessible.',
		modality: 'online',
		status: 'active',
		tags: ['a11y'],
		createdAt: '2026-03-10T00:00:00.000Z',
		updatedAt: '2026-06-10T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Cloud Architecture',
		summary: 'Retired hybrid architecture seminar.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['cloud'],
		createdAt: '2025-10-01T00:00:00.000Z',
		updatedAt: '2025-12-15T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Prompt Engineering',
		summary: 'Practical prompting for course builders.',
		modality: 'online',
		status: 'active',
		tags: ['Security', 'prompts'],
		createdAt: '2026-06-01T00:00:00.000Z',
		updatedAt: '2026-08-01T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'New Hire Orientation',
		summary: 'Welcome program for new instructors.',
		modality: 'in-person',
		status: 'active',
		tags: ['onboarding'],
		createdAt: '2026-01-05T00:00:00.000Z',
		updatedAt: '2026-01-06T00:00:00.000Z',
	},
];

/** In-memory course store seeded for local and test execution. */
export class InMemoryCourseCatalog implements CourseRepository {
	private readonly courses = new Map<string, Course>();

	public constructor(seed: readonly CourseProps[] = COURSE_SEED) {
		for (const props of seed) {
			if (this.courses.has(props.id)) {
				throw new Error(`Duplicate course id ${props.id}`);
			}
			this.courses.set(props.id, new Course({ ...props, tags: [...props.tags] }));
		}
	}

	public get(id: string): Promise<Course> {
		const course = this.courses.get(id);
		if (course === undefined) {
			return Promise.reject(new NotFoundError(`Course ${id} not found`));
		}
		return Promise.resolve(course);
	}

	public save(item: Course): Promise<Course> {
		this.courses.set(item.id, item);
		return Promise.resolve(item);
	}

	public list(): Promise<readonly Course[]> {
		return Promise.resolve([...this.courses.values()]);
	}
}
