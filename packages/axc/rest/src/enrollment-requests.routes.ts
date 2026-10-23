import { type ApplicationServicesFactory, EnrollmentRequestError, type EnrollmentRequestsQuery, enrollmentRequestStatuses, isEnrollmentRequestStatus, isValidEmail } from '@axc/application-services';
import type { Context, Hono } from 'hono';

interface Detail {
	field: string;
	message: string;
}

const errorBody = (code: string, message: string, details: Detail[]) => ({ error: { code, message, details } });

const fail = (c: Context, e: unknown): Response => {
	if (e instanceof EnrollmentRequestError) {
		return c.json(errorBody(e.code, e.message, e.details), e.code === 'ENROLLMENT_REQUEST_NOT_FOUND' ? 404 : 409);
	}
	throw e;
};

export function registerEnrollmentRequestsRoutes(app: Hono, factory: ApplicationServicesFactory): void {
	app.get('/api/enrollment-requests', async (c) => {
		const details: Detail[] = [];
		const statusRaw = c.req.query('status');
		if (statusRaw !== undefined && !isEnrollmentRequestStatus(statusRaw)) {
			details.push({ field: 'status', message: `status must be one of ${enrollmentRequestStatuses.join(', ')}.` });
		}
		const courseIdRaw = c.req.query('courseId');
		if (courseIdRaw !== undefined && courseIdRaw.length === 0) {
			details.push({ field: 'courseId', message: 'courseId must be a non-empty string.' });
		}
		const learnerEmailRaw = c.req.query('learnerEmail');
		if (learnerEmailRaw !== undefined && !isValidEmail(learnerEmailRaw)) {
			details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
		}
		if (details.length > 0) {
			return c.json(errorBody('INVALID_REQUEST', 'The request could not be completed.', details), 400);
		}
		const query: EnrollmentRequestsQuery = {};
		if (statusRaw !== undefined && isEnrollmentRequestStatus(statusRaw)) {
			query.status = statusRaw;
		}
		if (courseIdRaw !== undefined && courseIdRaw.length > 0) {
			query.courseId = courseIdRaw;
		}
		if (learnerEmailRaw !== undefined && isValidEmail(learnerEmailRaw)) {
			query.learnerEmail = learnerEmailRaw;
		}
		const authorization = c.req.header('Authorization');
		const services = authorization === undefined ? await factory.forRequest() : await factory.forRequest(authorization);
		return c.json({ items: services.enrollmentRequests.list(query) });
	});

	app.get('/api/enrollment-requests/:id', async (c) => {
		const id = c.req.param('id');
		if (id === undefined || id.length === 0) {
			return c.json(errorBody('INVALID_REQUEST', 'The request could not be completed.', [{ field: 'id', message: 'id is required.' }]), 400);
		}
		const authorization = c.req.header('Authorization');
		const services = authorization === undefined ? await factory.forRequest() : await factory.forRequest(authorization);
		try {
			return c.json(services.enrollmentRequests.getById(id));
		} catch (error) {
			return fail(c, error);
		}
	});
}
