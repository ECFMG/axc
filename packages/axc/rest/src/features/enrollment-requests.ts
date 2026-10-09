import type { ApplicationServicesFactory, CreateEnrollmentRequestCommand, EnrollmentRequestQuery, UpdateEnrollmentStatusCommand } from '@axc/application-services';
import type { Hono } from 'hono';
import { type Detail, failure, invalid, nonempty, readObject } from './errors.ts';

const statuses = ['pending', 'approved', 'rejected', 'cancelled'];
const emailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const registerEnrollmentRequestRoutes = (app: Hono, factory: ApplicationServicesFactory): void => {
	app.post('/api/enrollment-requests', async (c) => {
		const body = await readObject(c);
		const details: Detail[] = [];
		if (!body || !nonempty(body.courseId)) details.push({ field: 'courseId', message: 'courseId is required.' });
		if (!body || !nonempty(body.learnerEmail) || !emailValid(body.learnerEmail.trim())) details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
		if (!body || typeof body.justification !== 'string' || body.justification.trim().length < 20 || body.justification.trim().length > 500)
			details.push({ field: 'justification', message: 'justification must be between 20 and 500 characters.' });
		if (details.length) return invalid(c, 'INVALID_REQUEST', details);
		try {
			const services = await factory.forRequest();
			const request = await services.Catalog.EnrollmentRequest.create(body as unknown as CreateEnrollmentRequestCommand);
			return c.json(request, 201);
		} catch (error) {
			return failure(c, error);
		}
	});
	app.get('/api/enrollment-requests', async (c) => {
		const params = new URL(c.req.url).searchParams;
		const details: Detail[] = [];
		for (const key of params.keys()) {
			if (!['status', 'courseId', 'learnerEmail'].includes(key) || params.getAll(key).length > 1) details.push({ field: key, message: `${key} is invalid.` });
		}
		const status = params.get('status');
		const courseId = params.get('courseId');
		const learnerEmail = params.get('learnerEmail');
		if (status !== null && !statuses.includes(status)) details.push({ field: 'status', message: 'status is invalid.' });
		if (courseId !== null && !courseId.trim()) details.push({ field: 'courseId', message: 'courseId must not be empty.' });
		if (learnerEmail !== null && !emailValid(learnerEmail)) details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
		if (details.length) return invalid(c, 'INVALID_QUERY_PARAMETER', details);
		const filters: EnrollmentRequestQuery = {};
		if (status !== null) filters.status = status as NonNullable<EnrollmentRequestQuery['status']>;
		if (courseId !== null) filters.courseId = courseId;
		if (learnerEmail !== null) filters.learnerEmail = learnerEmail;
		const services = await factory.forRequest();
		return c.json({ items: await services.Catalog.EnrollmentRequest.query(filters) });
	});
	app.get('/api/enrollment-requests/:id', async (c) => {
		try {
			const services = await factory.forRequest();
			return c.json(await services.Catalog.EnrollmentRequest.queryById(c.req.param('id')));
		} catch (error) {
			return failure(c, error);
		}
	});
	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const body = await readObject(c);
		const details: Detail[] = [];
		if (!body || typeof body.status !== 'string' || !statuses.includes(body.status)) details.push({ field: 'status', message: 'status is invalid.' });
		if (!body || !nonempty(body.changedBy)) details.push({ field: 'changedBy', message: 'changedBy is required.' });
		if (body?.status === 'rejected' && !nonempty(body.reason)) details.push({ field: 'reason', message: 'reason is required for rejection.' });
		if (body?.reason !== undefined && typeof body.reason !== 'string') details.push({ field: 'reason', message: 'reason must be a string.' });
		if (details.length) return invalid(c, 'INVALID_REQUEST', details);
		try {
			const services = await factory.forRequest();
			const command = { ...body, id: c.req.param('id') } as unknown as UpdateEnrollmentStatusCommand;
			return c.json(await services.Catalog.EnrollmentRequest.updateStatus(command));
		} catch (error) {
			return failure(c, error);
		}
	});
};
