import type { CourseVisa } from './course/course.visa.ts';

export interface Passport {
	course: {
		forCourse(entity: unknown): CourseVisa;
	};
}

export const PassportFactory = {
	forSystem(): Passport {
		return {
			course: {
				forCourse: () => ({
					determineIf: (check: (permissions: { canManageCourse: boolean }) => boolean) => check({ canManageCourse: true }),
				}),
			},
		};
	},
};
