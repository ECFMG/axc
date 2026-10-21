/** Raw query string values. Each key maps to every value sent for that parameter. */
export type QueryValues = Readonly<Record<string, readonly string[]>>;

export interface FieldDetail {
	field: string;
	message: string;
}

export function readSingleQueryValue(query: QueryValues, parameter: string, details: FieldDetail[]): string | undefined {
	const values = query[parameter];
	if (values === undefined) {
		return undefined;
	}
	const only = values.length === 1 ? values[0] : undefined;
	if (only === undefined) {
		details.push({ field: parameter, message: `${parameter} must be specified once.` });
		return undefined;
	}
	return only;
}

export function readUnknownQueryParameters(query: QueryValues, supported: readonly string[], details: FieldDetail[]): void {
	const supportedNames = new Set<string>(supported);
	const unknownFields = Object.keys(query)
		.filter((key) => !supportedNames.has(key))
		.sort((left, right) => left.localeCompare(right));
	for (const field of unknownFields) {
		details.push({ field, message: `${field} is not a supported query parameter.` });
	}
}
