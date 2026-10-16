import type { TrainingApplicationServicesFactory } from '@axc/application-services';
import { Domain } from '@axc/domain';
import { Hono } from 'hono';
import { enumValue, HttpInputError, type InvalidField, learnerEmail, objectBody, optionalText, requiredString } from '../../../validation.ts';
export function createEnrollmentRequestRoutes(factory: TrainingApplicationServicesFactory): Hono {
	const app = new Hono();
	app.post('/', async (c) => {
		const body = await objectBody(c);
		const details: InvalidField[] = [];
		const courseId = requiredString(body, 'courseId', details);
		const email = requiredString(body, 'learnerEmail', details);
		learnerEmail(email, details);
		const { justification } = body;
		if (typeof justification !== 'string' || !Domain.Contexts.Training.EnrollmentRequest.isEnrollmentJustification(justification)) {
			details.push({ field: 'justification', message: 'justification must be between 20 and 500 characters.' });
		}
		if (details.length > 0 || courseId === undefined || email === undefined || typeof justification !== 'string') {
			throw new HttpInputError('INVALID_REQUEST', details);
		}
		const services = await factory.forRequest(c.req.header('Authorization'));
		const request = await services.enrollmentRequests.create({ courseId, learnerEmail: email, justification });
		return c.json(request, 201);
	});
	app.get('/', async (c) => {
		const query: { status?: string; courseId?: string; learnerEmail?: string } = c.req.query();
		const details: InvalidField[] = [];
		const status = enumValue(query.status, Domain.Contexts.Training.EnrollmentRequest.ENROLLMENT_REQUEST_STATUSES, 'status', details);
		const courseId = optionalText(query.courseId);
		const email = optionalText(query.learnerEmail);
		learnerEmail(email, details);
		if (details.length > 0) {
			throw new HttpInputError('INVALID_REQUEST', details);
		}
		const services = await factory.forRequest(c.req.header('Authorization'));
		const items = await services.enrollmentRequests.list({ ...(status === undefined ? {} : { status }), ...(courseId === undefined ? {} : { courseId }), ...(email === undefined ? {} : { learnerEmail: email }) });
		return c.json({ items });
	});
	app.get('/:id', async (c) => {
		const services = await factory.forRequest(c.req.header('Authorization'));
		return c.json(await services.enrollmentRequests.queryById({ id: c.req.param('id') }));
	});
	app.patch('/:id/status', async (c) => {
		const body = await objectBody(c);
		const details: InvalidField[] = [];
		const statusText = requiredString(body, 'status', details);
		const status = enumValue(statusText, Domain.Contexts.Training.EnrollmentRequest.ENROLLMENT_REQUEST_STATUSES, 'status', details);
		const changedBy = requiredString(body, 'changedBy', details);
		const { reason: rawReason } = body;
		let reason: string | undefined;
		if (rawReason !== undefined && rawReason !== null) {
			if (typeof rawReason !== 'string') {
				details.push({ field: 'reason', message: 'reason must be a string.' });
			} else {
				reason = optionalText(rawReason);
			}
		}
		if (status === 'rejected' && reason === undefined) {
			details.push({ field: 'reason', message: 'reason is required when rejecting a request.' });
		}
		if (details.length > 0 || status === undefined || changedBy === undefined) {
			throw new HttpInputError('INVALID_REQUEST', details);
		}
		const services = await factory.forRequest(c.req.header('Authorization'));
		return c.json(await services.enrollmentRequests.changeStatus({ id: c.req.param('id'), status, changedBy, ...(reason === undefined ? {} : { reason }) }));
	});
	return app;
}
