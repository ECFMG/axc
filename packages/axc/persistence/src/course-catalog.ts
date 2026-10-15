import type { Course, CourseCatalog } from '@axc/domain';
import { courseFixtures } from './course-fixtures.ts';

/** Isolated snapshots keep callers from changing the sample catalog across requests. */
export function createFixtureCourseCatalog(): CourseCatalog {
	return {
		list(): Promise<readonly Course[]> {
			return Promise.resolve(structuredClone(courseFixtures));
		},
	};
}
