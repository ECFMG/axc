import type { ApplicationServicesFactory, CourseModality, CourseQueryCommand, CourseSortField, CourseStatus } from '@axc/application-services';
import type { Hono } from 'hono';
import { errorResponse, type FieldError, oneOf, positiveInteger, readQuery, servicesFor } from './http.ts';

const modalities: readonly CourseModality[] = ['online', 'in-person', 'hybrid'];
const statuses: readonly CourseStatus[] = ['draft', 'active', 'retired'];
const sortFields: readonly CourseSortField[] = ['title', 'createdAt', 'updatedAt'];
const supportedParameters = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];

/** HTTP input parsing belongs to rest: query strings become a typed command or a 400 listing every invalid parameter. */
function parseCourseQuery(query: Record<string, string[]>): { ok: true; value: CourseQueryCommand } | { ok: false; errors: FieldError[] } {
	const errors: FieldError[] = [];
	// Destructuring keeps both noPropertyAccessFromIndexSignature (tsc) and useLiteralKeys (biome) satisfied.
	const { q, modality, status, tag, page, pageSize, sort } = readQuery(query, supportedParameters, errors);
	const value: CourseQueryCommand = {
		page: positiveInteger(page, 1, 'page', Number.MAX_SAFE_INTEGER, errors),
		pageSize: positiveInteger(pageSize, 10, 'pageSize', 50, errors),
		sort: oneOf(sort, sortFields, 'sort', errors) ?? 'title',
	};
	const parsedModality = oneOf(modality, modalities, 'modality', errors);
	const parsedStatus = oneOf(status, statuses, 'status', errors);
	if (parsedModality) {
		value.modality = parsedModality;
	}
	if (parsedStatus) {
		value.status = parsedStatus;
	}
	// An empty keyword or tag means "no filter".
	if (q) {
		value.q = q;
	}
	if (tag) {
		value.tag = tag;
	}
	return errors.length > 0 ? { ok: false, errors } : { ok: true, value };
}

export function registerCourseRoutes(app: Hono, applicationServicesFactory: ApplicationServicesFactory): void {
	app.get('/api/courses', async (c) => {
		const parsed = parseCourseQuery(c.req.queries());
		if (!parsed.ok) {
			return errorResponse(c, 400, 'INVALID_QUERY_PARAMETER', 'One or more query parameters are invalid.', parsed.errors);
		}
		const services = await servicesFor(c, applicationServicesFactory);
		return c.json(await services.Catalog.Course.queryCourses(parsed.value));
	});
}
