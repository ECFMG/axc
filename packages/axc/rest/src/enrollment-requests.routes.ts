import {
	type ApplicationServicesFactory,
	EnrollmentError,
	type EnrollmentErrorCode,
	type EnrollmentListQuery,
	type EnrollmentRequest,
	type EnrollmentStatus,
	type EnrollmentStore,
	enrollmentStatuses,
	isEnrollmentStatus,
	isValidLearnerEmail,
} from '@axc/application-services';
import type { Context, Hono } from 'hono';

interface Detail {
	field: string;
	message: string;
}

const requestError = (code: EnrollmentErrorCode, details: Detail[]) => ({
	error: {
		code,
		message: 'The request could not be completed.',
		details,
	},
});

const STATUS = {
	COURSE_NOT_FOUND: 404,
	COURSE_NOT_ACTIVE: 409,
	DUPLICATE_ACTIVE_REQUEST: 409,
	ENROLLMENT_REQUEST_NOT_FOUND: 404,
	INVALID_STATUS_TRANSITION: 409,
	INVALID_REQUEST: 400,
} as const satisfies Record<EnrollmentErrorCode, number>;

const fail = (c: Context, error: unknown): Response => {
	if (error instanceof EnrollmentError) return c.json(requestError(error.code, [{ field: error.field, message: error.message }]), STATUS[error.code]);
	throw error;
};

export function registerEnrollmentRequestRoutes(app: Hono, factory: ApplicationServicesFactory): void {
	const servicesFor = (authorization: string | undefined) => (authorization === undefined ? factory.forRequest() : factory.forRequest(authorization));

	app.get('/api/enrollment-requests', async (c) => {
		const details: Detail[] = [];
		const statusRaw = c.req.query('status');
		const courseIdRaw = c.req.query('courseId');
		const learnerEmailRaw = c.req.query('learnerEmail');
		if (statusRaw !== undefined && !isEnrollmentStatus(statusRaw)) details.push({ field: 'status', message: `status must be one of ${enrollmentStatuses.join(', ')}.` });
		if (courseIdRaw !== undefined && courseIdRaw.trim() === '') details.push({ field: 'courseId', message: 'courseId must be a non-empty string.' });
		if (learnerEmailRaw !== undefined && !isValidLearnerEmail(learnerEmailRaw)) details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
		if (details.length > 0) return c.json(requestError('INVALID_REQUEST', details), 400);

		let status: EnrollmentStatus | undefined;
		if (statusRaw !== undefined && isEnrollmentStatus(statusRaw)) status = statusRaw;
		const query: EnrollmentListQuery = {};
		if (status !== undefined) query.status = status;
		if (courseIdRaw !== undefined && courseIdRaw.trim() !== '') query.courseId = courseIdRaw.trim();
		if (learnerEmailRaw !== undefined && isValidLearnerEmail(learnerEmailRaw)) query.learnerEmail = learnerEmailRaw;
		const services = await servicesFor(c.req.header('Authorization'));
		const store: EnrollmentStore = services.enrollmentRequests;
		const items: EnrollmentRequest[] = store.list(query);
		return c.json({ items });
	});

	app.get('/api/enrollment-requests/:id', async (c) => {
		const services = await servicesFor(c.req.header('Authorization'));
		try {
			const body: EnrollmentRequest = services.enrollmentRequests.get(c.req.param('id'));
			return c.json(body);
		} catch (error) {
			return fail(c, error);
		}
	});
}
