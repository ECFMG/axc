import { type Course, courseCatalogSeed, type EnrollmentRequest } from '@axc/domain';

/** Process-local catalog used by application services through ApiContext. */
export interface CourseCatalog {
	listCourses(): readonly Course[];
	findCourseById(id: string): Course | undefined;
	listEnrollmentRequests(): readonly EnrollmentRequest[];
	findEnrollmentRequestById(id: string): EnrollmentRequest | undefined;
	addEnrollmentRequest(request: EnrollmentRequest): void;
	replaceEnrollmentRequest(request: EnrollmentRequest): void;
	allocateEnrollmentId(): string;
}

export function createMemoryCatalog(courses: readonly Course[] = courseCatalogSeed()): CourseCatalog {
	const courseList = courses.map(copyCourse);
	const coursesById = new Map(courseList.map((course) => [course.id, course]));
	const requests: EnrollmentRequest[] = [];
	let sequence = 0;

	return {
		listCourses(): readonly Course[] {
			return courseList.map(copyCourse);
		},
		findCourseById(id: string): Course | undefined {
			const course = coursesById.get(id);
			return course === undefined ? undefined : copyCourse(course);
		},
		listEnrollmentRequests(): readonly EnrollmentRequest[] {
			return requests.map(copyRequest);
		},
		findEnrollmentRequestById(id: string): EnrollmentRequest | undefined {
			const request = requests.find((item) => item.id === id);
			return request === undefined ? undefined : copyRequest(request);
		},
		addEnrollmentRequest(request: EnrollmentRequest): void {
			requests.push(copyRequest(request));
		},
		replaceEnrollmentRequest(request: EnrollmentRequest): void {
			const index = requests.findIndex((item) => item.id === request.id);
			if (index === -1) {
				throw new Error(`Enrollment request ${request.id} was not found.`);
			}
			requests[index] = copyRequest(request);
		},
		allocateEnrollmentId(): string {
			sequence += 1;
			return `enroll-${String(sequence).padStart(3, '0')}`;
		},
	};
}

function copyCourse(course: Course): Course {
	return { ...course, tags: [...course.tags] };
}

function copyRequest(request: EnrollmentRequest): EnrollmentRequest {
	return {
		...request,
		statusHistory: request.statusHistory.map((entry) => ({ ...entry })),
	};
}
