import type { CourseVisa } from './course/course.visa.ts';
import type { EnrollmentVisa } from './enrollment/enrollment.visa.ts';

export interface Passport {
	course: {
		forCourse(entity: unknown): CourseVisa;
	};
	enrollment: {
		forEnrollmentRequest(entity: unknown): EnrollmentVisa;
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
			enrollment: {
				forEnrollmentRequest: () => ({
					determineIf: (check: (permissions: { canManageEnrollmentRequest: boolean }) => boolean) => check({ canManageEnrollmentRequest: true }),
				}),
			},
		};
	},
};
