/** Hono route definitions for the agentCourses REST API. */

import type { ApplicationServices, ApplicationServicesFactory } from '@axc/application-services';
import type { Hono } from 'hono';
import { readJsonBody } from './json-body.ts';

/** Registers `GET /health`. */
export function registerHealthRoutes(app: Hono, services: (authorization: string | undefined) => Promise<ApplicationServices>): void {
	app.get('/health', async (c) => {
		const applicationServices = await services(c.req.header('Authorization'));
		return c.json(applicationServices.health.getStatus());
	});
}

/** Registers `GET /api/courses`. */
export function registerCourseRoutes(app: Hono, services: (authorization: string | undefined) => Promise<ApplicationServices>): void {
	app.get('/api/courses', async (c) => {
		const applicationServices = await services(c.req.header('Authorization'));
		return c.json(await applicationServices.courses.search(c.req.query()));
	});
}

/** Registers the `/api/enrollment-requests` workflow routes. */
export function registerEnrollmentRequestRoutes(app: Hono, services: (authorization: string | undefined) => Promise<ApplicationServices>): void {
	app.post('/api/enrollment-requests', async (c) => {
		const applicationServices = await services(c.req.header('Authorization'));
		const created = await applicationServices.enrollmentRequests.create(await readJsonBody(c));
		return c.json(created, 201);
	});

	app.get('/api/enrollment-requests', async (c) => {
		const applicationServices = await services(c.req.header('Authorization'));
		const items = await applicationServices.enrollmentRequests.list(c.req.query());
		return c.json({ items, totalItems: items.length });
	});

	app.get('/api/enrollment-requests/:id', async (c) => {
		const applicationServices = await services(c.req.header('Authorization'));
		return c.json(await applicationServices.enrollmentRequests.getById(c.req.param('id')));
	});

	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const applicationServices = await services(c.req.header('Authorization'));
		return c.json(await applicationServices.enrollmentRequests.changeStatus(c.req.param('id'), await readJsonBody(c)));
	});
}

/** Builds the per-request application services resolver used by every route. */
export function requestScopedServices(applicationServicesFactory: ApplicationServicesFactory): (authorization: string | undefined) => Promise<ApplicationServices> {
	return (authorization) => (authorization === undefined ? applicationServicesFactory.forRequest() : applicationServicesFactory.forRequest(authorization));
}
