/**
 * Helpers for reading untrusted query string and request body values.
 *
 * @remarks
 * Every accessor takes the field name as a variable so the domain never reaches into an index
 * signature with a literal key, and so the delivery layer can hand over raw parsed JSON without
 * first asserting a shape.
 */

/** Untyped query string bag produced by the delivery layer. */
export type RawQuery = Readonly<Record<string, string | undefined>>;

/** Untyped request body produced by the delivery layer. */
export type RawBody = Readonly<Record<string, unknown>>;

/** Narrows an unknown parsed body to a plain object, or `undefined` when it is not one. */
export function asRawBody(input: unknown): RawBody | undefined {
	if (typeof input !== 'object' || input === null || Array.isArray(input)) {
		return undefined;
	}
	return input as RawBody;
}

/** Reads a query parameter, collapsing blank values to `undefined`. */
export function readQueryValue(query: RawQuery, field: string): string | undefined {
	const value = query[field];
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length === 0 ? undefined : trimmed;
}

/** Reads a body field without asserting its type. */
export function readBodyValue(body: RawBody, field: string): unknown {
	return body[field];
}
