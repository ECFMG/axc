import { type Course, type CourseRepository, courseCatalog, type EnrollmentRequest, type EnrollmentRequestRepository } from '@axc/domain';

export function createSeededCourseRepository(): CourseRepository {
	return createInMemoryCourseRepository(courseCatalog);
}

export function createInMemoryCourseRepository(courses: readonly Course[]): CourseRepository {
	const stored = courses.map((course) => structuredClone(course));
	return {
		list: () => Promise.resolve(stored.map((course) => structuredClone(course))),
		getById: (id) => {
			const found = stored.find((course) => course.id === id);
			return Promise.resolve(found === undefined ? undefined : structuredClone(found));
		},
	};
}

export function createInMemoryEnrollmentRequestRepository(): EnrollmentRequestRepository {
	const stored: EnrollmentRequest[] = [];
	return {
		list: () => Promise.resolve(stored.map((request) => structuredClone(request))),
		getById: (id) => {
			const found = stored.find((request) => request.id === id);
			return Promise.resolve(found === undefined ? undefined : structuredClone(found));
		},
		save: (request) => {
			const copy = structuredClone(request);
			const index = stored.findIndex((existing) => existing.id === copy.id);
			if (index === -1) {
				stored.push(copy);
			} else {
				stored[index] = copy;
			}
			return Promise.resolve(structuredClone(copy));
		},
	};
}
