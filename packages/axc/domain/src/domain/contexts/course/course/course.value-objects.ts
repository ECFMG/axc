import { DomainError, type ErrorDetail } from '../../../domain-error.ts';

export const CourseModalities = { Online: 'online', InPerson: 'in-person', Hybrid: 'hybrid' } as const;
export type CourseModality = (typeof CourseModalities)[keyof typeof CourseModalities];

export const CourseStatuses = { Draft: 'draft', Active: 'active', Retired: 'retired' } as const;
export type CourseStatus = (typeof CourseStatuses)[keyof typeof CourseStatuses];

export const CourseSortFields = { Title: 'title', CreatedAt: 'createdAt', UpdatedAt: 'updatedAt' } as const;
export type CourseSortField = (typeof CourseSortFields)[keyof typeof CourseSortFields];

const MAX_PAGE_SIZE = 50;

const oneOf = <T extends string>(values: Record<string, T>, raw: string): raw is T => (Object.values(values) as string[]).includes(raw);

const positiveInt = (raw: string): number | undefined => (/^\d+$/.test(raw) ? Number(raw) : undefined);

/** Validated course search request; `parse` rejects any malformed parameter with INVALID_QUERY_PARAMETER. */
export class CourseSearchCriteria {
	readonly q: string | undefined;
	readonly modality: CourseModality | undefined;
	readonly status: CourseStatus | undefined;
	readonly tag: string | undefined;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: CourseSortField;

	private constructor(fields: Omit<CourseSearchCriteria, never>) {
		this.q = fields.q;
		this.modality = fields.modality;
		this.status = fields.status;
		this.tag = fields.tag;
		this.page = fields.page;
		this.pageSize = fields.pageSize;
		this.sort = fields.sort;
	}

	static parse(raw: Record<string, string | undefined>): CourseSearchCriteria {
		const details: ErrorDetail[] = [];
		const { q, modality, status, tag, page = '1', pageSize = '10', sort = CourseSortFields.Title } = raw;
		if (modality !== undefined && !oneOf(CourseModalities, modality)) {
			details.push({ field: 'modality', message: `modality must be one of ${Object.values(CourseModalities).join(', ')}.` });
		}
		if (status !== undefined && !oneOf(CourseStatuses, status)) {
			details.push({ field: 'status', message: `status must be one of ${Object.values(CourseStatuses).join(', ')}.` });
		}
		const pageNumber = positiveInt(page);
		if (pageNumber === undefined || pageNumber < 1) {
			details.push({ field: 'page', message: 'page must be a positive integer.' });
		}
		const pageSizeNumber = positiveInt(pageSize);
		if (pageSizeNumber === undefined || pageSizeNumber < 1 || pageSizeNumber > MAX_PAGE_SIZE) {
			details.push({ field: 'pageSize', message: `pageSize must be between 1 and ${MAX_PAGE_SIZE}.` });
		}
		if (!oneOf(CourseSortFields, sort)) {
			details.push({ field: 'sort', message: `sort must be one of ${Object.values(CourseSortFields).join(', ')}.` });
		}
		if (details.length > 0) {
			throw new DomainError('INVALID_QUERY_PARAMETER', 'One or more query parameters are invalid.', details);
		}
		return new CourseSearchCriteria({
			q: q?.trim() || undefined,
			modality: modality as CourseModality | undefined,
			status: status as CourseStatus | undefined,
			tag: tag?.trim() || undefined,
			page: pageNumber as number,
			pageSize: pageSizeNumber as number,
			sort: sort as CourseSortField,
		});
	}
}
