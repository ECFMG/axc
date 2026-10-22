import { ApplicationFailure, type ApplicationServicesFactory } from '@axc/application-services';
import type { Hono } from 'hono';
import { body, respondToError, stringField } from './errors.ts';
export const registerEnrollmentRequests = (app: Hono, factory: ApplicationServicesFactory) => {
	app.post('/api/enrollment-requests', async (c) => {
		try {
			const input = await body(c);
			const result = await (await factory.forRequest()).Training.EnrollmentRequest.create({
				courseId: stringField(input.courseId),
				learnerEmail: stringField(input.learnerEmail),
				justification: stringField(input.justification),
			});
			return c.json(result, 201);
		} catch (error) {
			return respondToError(c, error);
		}
	});
	app.get('/api/enrollment-requests', async (c) => {
		try {
			const params = new URL(c.req.url).searchParams;
			const allowed = new Set(['status', 'courseId', 'learnerEmail']);
			const details = [...params.keys()].filter((key) => !allowed.has(key) || params.getAll(key).length > 1).map((field) => ({ field, message: 'Unknown or repeated parameter.' }));
			if (details.length) throw new ApplicationFailure('INVALID_REQUEST', 'The request could not be completed.', details);
			const result = await (await factory.forRequest()).Training.EnrollmentRequest.list({
				...(params.has('status') ? { status: params.get('status') ?? '' } : {}),
				...(params.has('courseId') ? { courseId: params.get('courseId') ?? '' } : {}),
				...(params.has('learnerEmail') ? { learnerEmail: params.get('learnerEmail') ?? '' } : {}),
			});
			return c.json({ items: result });
		} catch (error) {
			return respondToError(c, error);
		}
	});
	app.get('/api/enrollment-requests/:id', async (c) => {
		try {
			return c.json(await (await factory.forRequest()).Training.EnrollmentRequest.getById({ id: c.req.param('id') }));
		} catch (error) {
			return respondToError(c, error);
		}
	});
	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		try {
			const input = await body(c);
			const result = await (await factory.forRequest()).Training.EnrollmentRequest.updateStatus({
				id: c.req.param('id'),
				status: stringField(input.status),
				changedBy: stringField(input.changedBy),
				...(input.reason !== undefined ? { reason: stringField(input.reason) } : {}),
			});
			return c.json(result);
		} catch (error) {
			return respondToError(c, error);
		}
	});
};
