import type { CourseApplicationService } from './course/index.ts';
import type { EnrollmentRequestApplicationService } from './enrollment-request/index.ts';

export * as Course from './course/index.ts';
export * as EnrollmentRequest from './enrollment-request/index.ts';

export interface TrainingApplicationService {
	courses: CourseApplicationService;
	enrollmentRequests: EnrollmentRequestApplicationService;
}
