import type { Domain } from '@axc/domain';

type Problem = Domain.Contexts.Catalog.Problem;
export function text(value: unknown, field: string, details: Problem[], required = false): string | undefined {
	if (value === undefined && !required) return undefined;
	if (typeof value !== 'string' || !value.trim()) {
		details.push({ field, message: `${field} must be non-empty text.` });
		return undefined;
	}
	return value.trim();
}
export function choice<T extends string>(value: unknown, field: string, allowed: readonly T[], details: Problem[]): T | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== 'string' || !allowed.includes(value as T)) {
		details.push({ field, message: `${field} must be one of ${allowed.join(', ')}.` });
		return undefined;
	}
	return value as T;
}
export function integer(value: string | undefined, field: string, fallback: number, max: number, details: Problem[]): number {
	if (value === undefined) return fallback;
	const n = Number(value);
	if (!/^\d+$/.test(value) || !Number.isSafeInteger(n) || n < 1 || n > max) {
		details.push({ field, message: `${field} must be between 1 and ${max}.` });
		return fallback;
	}
	return n;
}
export function queryFields(url: string, allowed: string[], details: Problem[]): void {
	const params = new URL(url).searchParams;
	for (const key of new Set(params.keys())) {
		if (!allowed.includes(key)) details.push({ field: key, message: 'Unknown query parameter.' });
		if (params.getAll(key).length > 1) details.push({ field: key, message: 'Query parameter must occur once.' });
	}
}
