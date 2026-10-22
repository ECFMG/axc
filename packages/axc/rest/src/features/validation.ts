import type { Domain } from '@axc/domain';
import type { Context } from 'hono';
export type Detail = Domain.Contexts.Catalog.EnrollmentRequest.ValidationDetail;
export function invalid(c: Context, details: Detail[], query = false): Response {
	return c.json({ error: { code: query ? 'INVALID_QUERY_PARAMETER' : 'INVALID_REQUEST', message: query ? 'One or more query parameters are invalid.' : 'The request could not be completed.', details } }, 400);
}
export function queryFields<K extends string>(c: Context, allowed: readonly K[], details: Detail[]): Partial<Record<K, string>> {
	const values: Record<string, string> = {};
	for (const [field, entries] of Object.entries(c.req.queries())) {
		if (!allowed.includes(field as K)) details.push({ field, message: 'Unknown query parameter.' });
		if (entries.length !== 1 || !entries[0]?.trim()) details.push({ field, message: 'Provide one non-empty value.' });
		values[field] = entries[0]?.trim() ?? '';
	}
	return values as Partial<Record<K, string>>;
}
interface RequestBody {
	courseId?: unknown;
	learnerEmail?: unknown;
	justification?: unknown;
	status?: unknown;
	changedBy?: unknown;
	reason?: unknown;
}
export async function body(c: Context): Promise<RequestBody | null> {
	try {
		const parsed: unknown = await c.req.json();
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as RequestBody) : null;
	} catch {
		return null;
	}
}
export function stringField(value: unknown): string {
	return typeof value === 'string' ? value : '';
}
