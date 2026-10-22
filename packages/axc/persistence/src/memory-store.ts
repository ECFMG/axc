import { COURSE_FIXTURES, type Course, copyCourse, copyEnrollmentRequest, type EnrollmentRequest, isActiveEnrollmentStatus } from '@axc/domain';

export interface CourseCatalog {
	getById(id: string): Course | null;
	list(): readonly Course[];
}

export interface EnrollmentRequestStore {
	getById(id: string): EnrollmentRequest | null;
	list(): readonly EnrollmentRequest[];
	findActive(learnerEmail: string, courseId: string): EnrollmentRequest | null;
	insert(request: EnrollmentRequest): EnrollmentRequest;
	replace(request: EnrollmentRequest): EnrollmentRequest;
	nextId(): string;
}

export function createCourseCatalog(courses: readonly Course[] = COURSE_FIXTURES): CourseCatalog {
	const records = courses.map((course) => copyCourse(course));
	const byId = new Map(records.map((course) => [course.id, course]));

	return {
		getById(id: string): Course | null {
			const course = byId.get(id);
			return course === undefined ? null : copyCourse(course);
		},
		list(): readonly Course[] {
			return records.map((course) => copyCourse(course));
		},
	};
}

export function createEnrollmentRequestStore(): EnrollmentRequestStore {
	const records = new Map<string, EnrollmentRequest>();
	let sequence = 0;

	return {
		getById(id: string): EnrollmentRequest | null {
			const request = records.get(id);
			return request === undefined ? null : copyEnrollmentRequest(request);
		},
		list(): readonly EnrollmentRequest[] {
			return [...records.values()].map((request) => copyEnrollmentRequest(request));
		},
		findActive(learnerEmail: string, courseId: string): EnrollmentRequest | null {
			const email = learnerEmail.trim().toLowerCase();
			const found = [...records.values()].find((request) => request.courseId === courseId && request.learnerEmail === email && isActiveEnrollmentStatus(request.status));
			return found === undefined ? null : copyEnrollmentRequest(found);
		},
		insert(request: EnrollmentRequest): EnrollmentRequest {
			const stored = copyEnrollmentRequest(request);
			records.set(stored.id, stored);
			return copyEnrollmentRequest(stored);
		},
		replace(request: EnrollmentRequest): EnrollmentRequest {
			if (!records.has(request.id)) {
				throw new Error(`Enrollment request ${request.id} was not found.`);
			}
			const stored = copyEnrollmentRequest(request);
			records.set(stored.id, stored);
			return copyEnrollmentRequest(stored);
		},
		nextId(): string {
			sequence += 1;
			return `enroll-${String(sequence).padStart(3, '0')}`;
		},
	};
}
