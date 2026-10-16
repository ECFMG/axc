import type { ApplicationServicesFactory } from '@axc/application-services';
import type { Context } from 'hono';
export function requestServices(context: Context, factory: ApplicationServicesFactory) {
	const authorization = context.req.header('Authorization');
	return authorization === undefined ? factory.forRequest() : factory.forRequest(authorization);
}
