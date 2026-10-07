import { type Course, type CourseCatalogReadRepository, type CourseSearchCriteria, type CourseSearchMatches, compareCoursesBy, courseMatchesCriteria } from '@axc/domain';
import { courseCatalogFixture } from './course-catalog-fixture.ts';

/**
 * In-memory read repository over a fixed course catalog.
 *
 * @remarks
 * The catalog is read-only and seeded from {@link courseCatalogFixture}, so the endpoint runs
 * without a database. A Mongoose-backed implementation of the same
 * {@link CourseCatalogReadRepository} contract can replace it without touching the
 * application services or the REST layer.
 *
 * @param courses - Catalog to serve. Defaults to the bundled fixture.
 */
export function buildCourseCatalogFixtureRepository(courses: readonly Course[] = courseCatalogFixture): CourseCatalogReadRepository {
	const search = (criteria: CourseSearchCriteria): Promise<CourseSearchMatches> => {
		const matches = courses.filter((course) => courseMatchesCriteria(course, criteria)).sort(compareCoursesBy(criteria.sort));
		const firstIndex = (criteria.page - 1) * criteria.pageSize;
		return Promise.resolve({
			items: matches.slice(firstIndex, firstIndex + criteria.pageSize),
			totalItems: matches.length,
		});
	};

	return { search };
}
