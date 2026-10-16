import type { ApplicationServicesFactory } from '@axc/application-services';
import type { Hono } from 'hono';
import { requestServices } from '../../request-services.ts';
import { jsonObject } from '../../validation.ts';
import { parseEnrollmentCreate, parseEnrollmentQuery, parseEnrollmentStatus } from './parse-request.ts';
export function registerEnrollmentRequests(app: Hono, factory: ApplicationServicesFactory): void {
	app.post('/api/enrollment-requests', async (context) => {
		const input = parseEnrollmentCreate(await jsonObject(context));
		const services = await requestServices(context, factory);
		return context.json(await services.Training.EnrollmentRequest.create(input), 201);
	});
	app.get('/api/enrollment-requests/:id', async (context) => {
		const services = await requestServices(context, factory);
		return context.json(await services.Training.EnrollmentRequest.queryById(context.req.param('id')));
	});
	app.get('/api/enrollment-requests', async (context) => {
		const criteria = parseEnrollmentQuery(context.req.query());
		const services = await requestServices(context, factory);
		return context.json(await services.Training.EnrollmentRequest.queryRequests(criteria));
	});
	app.patch('/api/enrollment-requests/:id/status', async (context) => {
		const input = parseEnrollmentStatus(await jsonObject(context));
		const services = await requestServices(context, factory);
		return context.json(await services.Training.EnrollmentRequest.changeStatus(context.req.param('id'), input));
	});
}
