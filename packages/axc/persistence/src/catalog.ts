import type { Course, EnrollmentRequest } from '@axc/domain';

const fixture = [
	['course-001', 'AI Security Foundations', 'Secure AI-assisted development.', 'online', 'active', 'ai,security'],
	['course-002', 'Cloud Architecture', 'Design cloud systems.', 'hybrid', 'active', 'cloud,architecture'],
	['course-003', 'Data Privacy', 'Practical privacy controls.', 'in-person', 'active', 'privacy,security'],
	['course-004', 'Machine Learning Basics', 'Introduction to ML.', 'online', 'draft', 'ai,data'],
	['course-005', 'Legacy Systems', 'Maintain older systems.', 'in-person', 'retired', 'architecture'],
	['course-006', 'Secure Coding', 'Development security practices.', 'online', 'active', 'security,development'],
	['course-007', 'API Design', 'Build clear APIs.', 'hybrid', 'active', 'api,development'],
	['course-008', 'Data Engineering', 'Data pipelines and quality.', 'online', 'active', 'data,cloud'],
	['course-009', 'Leadership', 'Lead technical teams.', 'in-person', 'draft', 'management'],
	['course-010', 'Incident Response', 'Respond to security incidents.', 'hybrid', 'active', 'security,operations'],
	['course-011', 'Accessibility', 'Build accessible applications.', 'online', 'active', 'design'],
	['course-012', 'Testing Essentials', 'Reliable test practices.', 'in-person', 'retired', 'testing,development'],
] as const;

export class InMemoryCatalogRepository {
	private readonly courses: Course[] = fixture.map(([id, title, summary, modality, status, tags], index) => ({
		id,
		title,
		summary,
		modality,
		status,
		tags: tags.split(','),
		createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
		updatedAt: new Date(Date.UTC(2026, 5, index + 1)).toISOString(),
	}));
	private readonly requests = new Map<string, EnrollmentRequest>();

	listCourses(): Course[] {
		return this.courses.map((course) => ({ ...course, tags: [...course.tags] }));
	}
	getCourse(id: string): Course | undefined {
		return this.listCourses().find((course) => course.id === id);
	}
	getRequest(id: string): EnrollmentRequest | undefined {
		const request = this.requests.get(id);
		return request === undefined ? undefined : structuredClone(request);
	}
	listRequests(): EnrollmentRequest[] {
		return [...this.requests.values()].map((request) => structuredClone(request));
	}
	saveRequest(request: EnrollmentRequest): void {
		this.requests.set(request.id, structuredClone(request));
	}
}
