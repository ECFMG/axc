import type { ApplicationServices, ApplicationServicesFactory } from '@axc/application-services';

/**
 * Resolves the request-scoped application services for an inbound HTTP request.
 *
 * @param applicationServicesFactory - Factory injected by the composition root.
 * @param authorization - Raw `Authorization` header, when the caller sent one.
 * @returns Application services scoped to this request.
 */
export function resolveApplicationServices(applicationServicesFactory: ApplicationServicesFactory, authorization: string | undefined): Promise<ApplicationServices> {
	return authorization === undefined ? applicationServicesFactory.forRequest() : applicationServicesFactory.forRequest(authorization);
}
