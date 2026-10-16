import type { ApplicationServices } from '@axc/application-services';

const allowedParameters = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);
const modalities = new Set(['online', 'in-person', 'hybrid']);
const statuses = new Set(['draft', 'active', 'retired']);
const sorts = new Set(['title', 'createdAt', 'updatedAt']);

type CourseQueryResult = { status: 200 | 400; body: unknown };

export const courseQuery = async (applicationServices: ApplicationServices, values: Record<string, string[]>): Promise<CourseQueryResult> => {
	const details: { field: string; message: string }[] = [];
	const read = (field: string): string | undefined => {
		const entries = values[field];
		if (!entries || entries.length === 0) {
			return undefined;
		}
		if (entries.length > 1) {
			details.push({ field, message: `${field} must be provided once.` });
			return undefined;
		}
		return entries[0]?.trim();
	};

	for (const field of Object.keys(values)) {
		if (!allowedParameters.has(field)) {
			details.push({ field, message: `${field} is not a supported query parameter.` });
		}
	}

	const q = read('q');
	const modality = read('modality');
	const statusValue = read('status');
	const tag = read('tag');
	const pageText = read('page');
	const pageSizeText = read('pageSize');
	const sort = read('sort');

	if (q !== undefined && q.length === 0) {
		details.push({ field: 'q', message: 'q must not be empty.' });
	}
	if (tag !== undefined && tag.length === 0) {
		details.push({ field: 'tag', message: 'tag must not be empty.' });
	}
	if (modality !== undefined && !modalities.has(modality)) {
		details.push({ field: 'modality', message: 'modality must be online, in-person, or hybrid.' });
	}
	if (statusValue !== undefined && !statuses.has(statusValue)) {
		details.push({ field: 'status', message: 'status must be draft, active, or retired.' });
	}
	if (sort !== undefined && !sorts.has(sort)) {
		details.push({ field: 'sort', message: 'sort must be title, createdAt, or updatedAt.' });
	}

	let page = 1;
	if (pageText !== undefined) {
		if (!/^(?:0|[1-9]\d*)$/.test(pageText) || Number(pageText) < 1) {
			details.push({ field: 'page', message: 'page must be an integer greater than or equal to 1.' });
		} else {
			page = Number(pageText);
		}
	}

	let pageSize = 10;
	if (pageSizeText !== undefined) {
		if (!/^(?:0|[1-9]\d*)$/.test(pageSizeText) || Number(pageSizeText) < 1 || Number(pageSizeText) > 50) {
			details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
		} else {
			pageSize = Number(pageSizeText);
		}
	}

	if (details.length > 0) {
		return {
			status: 400,
			body: {
				error: {
					code: 'INVALID_QUERY_PARAMETER',
					message: 'One or more query parameters are invalid.',
					details,
				},
			},
		};
	}

	const resolvedSort = sort === 'createdAt' || sort === 'updatedAt' ? sort : 'title';
	const resolvedModality = modality === 'online' || modality === 'in-person' || modality === 'hybrid' ? modality : undefined;
	const resolvedStatus = statusValue === 'draft' || statusValue === 'active' || statusValue === 'retired' ? statusValue : undefined;
	return {
		status: 200,
		body: await applicationServices.Course.Course.query({
			...(q === undefined || q.length === 0 ? {} : { q }),
			...(resolvedModality === undefined ? {} : { modality: resolvedModality }),
			...(resolvedStatus === undefined ? {} : { status: resolvedStatus }),
			...(tag === undefined || tag.length === 0 ? {} : { tag }),
			page,
			pageSize,
			sort: resolvedSort,
		}),
	};
};
