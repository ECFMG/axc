export const modalities = ['online', 'in-person', 'hybrid'] as const;
export const statuses = ['draft', 'active', 'retired'] as const;
export const sorts = ['title', 'createdAt', 'updatedAt'] as const;
export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: (typeof modalities)[number];
	status: (typeof statuses)[number];
	tags: string[];
	createdAt: string;
	updatedAt: string;
}
export interface SearchQuery {
	q?: string;
	modality?: Course['modality'];
	status?: Course['status'];
	tag?: string;
	page: number;
	pageSize: number;
	sort: (typeof sorts)[number];
}
export interface SearchResult {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
export class InvalidCourseQuery extends Error {
	readonly details: { field: string; message: string }[];
	constructor(details: { field: string; message: string }[]) {
		super('One or more query parameters are invalid.');
		this.details = details;
	}
}
export function parseSearchQuery(input: Record<string, unknown>): SearchQuery {
	const details: { field: string; message: string }[] = [];
	const values: Record<string, string | number> = { page: 1, pageSize: 10, sort: 'title' };
	for (const [field, value] of Object.entries(input)) {
		if (!['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'].includes(field)) {
			details.push({ field, message: 'Unknown query parameter.' });
			continue;
		}
		if (field === 'page' || field === 'pageSize') {
			const number = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
			if (!Number.isSafeInteger(number) || number < 1 || (field === 'pageSize' && number > 50)) {
				details.push({ field, message: field === 'pageSize' ? 'pageSize must be between 1 and 50.' : 'page must be a positive safe integer.' });
			} else values[field] = number;
		} else if (typeof value !== 'string' || !value.trim()) {
			details.push({ field, message: `${field} must be a non-empty string supplied once.` });
		} else {
			const allowed = field === 'modality' ? modalities : field === 'status' ? statuses : field === 'sort' ? sorts : undefined;
			if (allowed && !(allowed as readonly string[]).includes(value)) details.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
			else values[field] = value.trim();
		}
	}
	if (details.length) throw new InvalidCourseQuery(details);
	return values as unknown as SearchQuery;
}
