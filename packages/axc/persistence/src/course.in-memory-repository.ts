import { Course, type CourseProps, type CourseRepository } from '@axc/domain';
import { NotFoundError } from '@cellix/domain-seedwork/repository';

const c = (n: number, title: string, summary: string, modality: CourseProps['modality'], status: CourseProps['status'], tags: string[], created: string, updated: string): CourseProps => ({
	id: `course-${String(n).padStart(3, '0')}`,
	title,
	summary,
	modality,
	status,
	tags,
	createdAt: `${created}T00:00:00.000Z`,
	updatedAt: `${updated}T00:00:00.000Z`,
});

export const courseSeed: readonly CourseProps[] = [
	c(1, 'AI Security Foundations', 'Introductory course on secure AI-assisted development.', 'online', 'active', ['ai', 'security'], '2026-01-15', '2026-06-01'),
	c(2, 'Clinical Skills Assessment Prep', 'Hands-on preparation for standardized patient encounters.', 'in-person', 'active', ['clinical', 'assessment'], '2025-09-10', '2026-02-20'),
	c(3, 'Data Privacy Essentials', 'HIPAA and GDPR basics for healthcare staff.', 'online', 'active', ['privacy', 'compliance'], '2025-11-03', '2026-03-12'),
	c(4, 'Machine Learning for Educators', 'Applying ML models to assessment analytics.', 'hybrid', 'draft', ['AI', 'analytics'], '2026-04-22', '2026-05-30'),
	c(5, 'Secure Coding Workshop', 'Practical SECURITY techniques for web developers.', 'in-person', 'retired', ['development'], '2024-06-01', '2025-01-15'),
	c(6, 'Bedside Communication', 'Patient communication and empathy skills.', 'in-person', 'active', ['clinical', 'communication'], '2025-03-18', '2025-12-01'),
	c(7, 'Cloud Fundamentals', 'Core cloud computing concepts and services.', 'online', 'draft', ['cloud', 'infrastructure'], '2026-02-08', '2026-02-09'),
	c(8, 'Exam Item Writing', 'Writing high-quality multiple-choice questions.', 'hybrid', 'active', ['assessment', 'writing'], '2025-07-14', '2026-04-04'),
	c(9, 'Incident Response Basics', 'Responding to cyber incidents in clinical settings.', 'hybrid', 'active', ['Security', 'operations'], '2025-05-27', '2026-01-19'),
	c(10, 'Legacy Systems Migration', 'Moving off mainframe credentialing systems.', 'online', 'retired', ['infrastructure', 'migration'], '2023-10-02', '2024-08-08'),
	c(11, 'Prompt Engineering Lab', 'Crafting effective prompts for generative AI tools.', 'online', 'active', ['ai', 'productivity'], '2026-03-05', '2026-07-11'),
	c(12, 'Accessibility in Assessment', 'Designing accessible testing accommodations.', 'hybrid', 'draft', ['accessibility', 'assessment'], '2025-12-12', '2026-06-18'),
];

export class InMemoryCourseRepository implements CourseRepository {
	private readonly courses = new Map<string, Course>();

	constructor(seed: readonly CourseProps[] = courseSeed) {
		for (const props of seed) this.courses.set(props.id, Course.getNewInstance(props));
	}
	getNewInstance(props: CourseProps): Course {
		return Course.getNewInstance(props);
	}
	getById(id: string): Promise<Course> {
		const course = this.courses.get(id);
		return course ? Promise.resolve(course) : Promise.reject(new NotFoundError(`Course ${id} not found`));
	}
	get(id: string): Promise<Course> {
		return this.getById(id);
	}
	save(item: Course): Promise<Course> {
		this.courses.set(item.id, item);
		return Promise.resolve(item);
	}
	getAll(): Promise<Course[]> {
		return Promise.resolve([...this.courses.values()]);
	}
}
