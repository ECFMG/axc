import type { ApplicationServices, ApplicationServicesFactory } from '@axc/application-services';
import type { Context } from 'hono';

/** Builds the request-scoped application services, forwarding the Authorization header when present. */
export function applicationServicesForRequest(applicationServicesFactory: ApplicationServicesFactory, c: Context): Promise<ApplicationServices> {
	const authorization = c.req.header('Authorization');
	return authorization === undefined ? applicationServicesFactory.forRequest() : applicationServicesFactory.forRequest(authorization);
}
