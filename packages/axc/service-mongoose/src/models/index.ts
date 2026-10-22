import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { CourseModelFactory } from './course/course.model.ts';
import { EnrollmentRequestModelFactory } from './enrollment-request/enrollment-request.model.ts';

export * as Course from './course/course.model.ts';
export * as EnrollmentRequest from './enrollment-request/enrollment-request.model.ts';

/** All Mongoose models, bound to the connection owned by ServiceMongoose. */
export const mongooseContextBuilder = (service: MongooseSeedwork.MongooseContextFactory) => ({
	Course: CourseModelFactory(service),
	EnrollmentRequest: EnrollmentRequestModelFactory(service),
});

export type ModelsContext = ReturnType<typeof mongooseContextBuilder>;
