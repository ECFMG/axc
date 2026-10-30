import { Course, type CourseModality, type CourseProps, type CourseRepository, type CourseStatus } from '@axc/domain';
import { NotFoundError } from '@cellix/domain-seedwork/repository';

type Seed = [id: string, title: string, summary: string, modality: CourseModality, status: CourseStatus, tags: string[], createdAt: string, updatedAt: string];

const seed: Seed[] = [
	['course-001', 'AI Security Foundations', 'Introductory course on secure AI-assisted development.', 'online', 'active', ['ai', 'security'], '2026-01-15', '2026-06-01'],
	['course-002', 'Threat Modeling Workshop', 'Hands-on threat modeling for product teams.', 'in-person', 'active', ['security', 'design'], '2026-02-01', '2026-05-10'],
	['course-003', 'Prompt Engineering Basics', 'Writing effective prompts for coding assistants.', 'online', 'active', ['ai', 'productivity'], '2026-01-05', '2026-04-20'],
	['course-004', 'Domain-Driven Design', 'Modeling complex domains with aggregates and bounded contexts.', 'hybrid', 'active', ['architecture', 'ddd'], '2025-11-12', '2026-03-02'],
	['course-005', 'Legacy Mainframe Operations', 'Operating batch jobs on legacy systems.', 'in-person', 'retired', ['operations'], '2024-03-01', '2025-01-15'],
	['course-006', 'Cloud Cost Management', 'Controlling spend on cloud platforms.', 'online', 'draft', ['cloud', 'finance'], '2026-06-10', '2026-06-12'],
	['course-007', 'Secure Code Review', 'Finding vulnerabilities during code review.', 'hybrid', 'active', ['security', 'code-review'], '2025-09-20', '2026-02-14'],
	['course-008', 'Machine Learning Ops', 'Deploying and monitoring ML models.', 'online', 'active', ['ai', 'mlops', 'cloud'], '2025-10-01', '2026-05-30'],
	['course-009', 'Accessibility for Developers', 'Building inclusive web interfaces.', 'online', 'active', ['frontend', 'a11y'], '2025-08-15', '2026-01-10'],
	['course-010', 'Incident Response Drills', 'Practicing coordinated incident response.', 'in-person', 'draft', ['security', 'operations'], '2026-05-01', '2026-05-02'],
	['course-011', 'Testing with Cucumber', 'Behaviour-driven acceptance testing.', 'hybrid', 'retired', ['testing', 'bdd'], '2024-06-01', '2025-06-01'],
	['course-012', 'TypeScript Deep Dive', 'Advanced types and compiler options.', 'online', 'active', ['typescript', 'frontend'], '2025-12-01', '2026-04-01'],
];

export class InMemoryCourseRepository implements CourseRepository {
	private readonly courses = new Map<string, Course>(
		seed.map(([id, title, summary, modality, status, tags, createdAt, updatedAt]) => [id, Course.getNewInstance({ id, title, summary, modality, status, tags, createdAt: new Date(createdAt), updatedAt: new Date(updatedAt) })]),
	);

	getNewInstance(props: CourseProps): Course {
		return Course.getNewInstance(props);
	}

	getById(id: string): Promise<Course | undefined> {
		return Promise.resolve(this.courses.get(id));
	}

	async get(id: string): Promise<Course> {
		const course = await this.getById(id);
		if (!course) throw new NotFoundError(`Course ${id} not found`);
		return course;
	}

	getAll(): Promise<Course[]> {
		return Promise.resolve([...this.courses.values()]);
	}

	save(item: Course): Promise<Course> {
		this.courses.set(item.id, item);
		return Promise.resolve(item);
	}
}
