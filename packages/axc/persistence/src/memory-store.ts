import type { Course, CourseRepository, EnrollmentRequest, EnrollmentRequestRepository } from '@axc/domain';
import { courseCatalog } from './course-catalog.ts';

// shortcut: process-local arrays lost on restart, replace when enrollment requests need a durable database.

export function createSeededCourseRepository(): CourseRepository {
	return createCourseRepository(courseCatalog);
}

export function createEnrollmentRequestRepository(): EnrollmentRequestRepository {
	const items: EnrollmentRequest[] = [];
	return {
		getById(id: string) {
			const found = items.find((request) => request.id === id);
			return Promise.resolve(found === undefined ? undefined : copyEnrollment(found));
		},
		list() {
			return Promise.resolve(items.map(copyEnrollment));
		},
		add(request: EnrollmentRequest) {
			items.push(copyEnrollment(request));
			return Promise.resolve();
		},
		save(request: EnrollmentRequest) {
			const index = items.findIndex((item) => item.id === request.id);
			if (index >= 0) {
				items[index] = copyEnrollment(request);
			}
			return Promise.resolve();
		},
	};
}

function createCourseRepository(courses: readonly Course[]): CourseRepository {
	const items = courses.map(copyCourse);
	return {
		getById(id: string) {
			const found = items.find((course) => course.id === id);
			return Promise.resolve(found === undefined ? undefined : copyCourse(found));
		},
		list() {
			return Promise.resolve(items.map(copyCourse));
		},
	};
}

function copyCourse(course: Course): Course {
	return { ...course, tags: [...course.tags] };
}

function copyEnrollment(request: EnrollmentRequest): EnrollmentRequest {
	return { ...request, statusHistory: request.statusHistory.map((entry) => ({ ...entry })) };
}
