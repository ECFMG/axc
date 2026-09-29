/** Error code returned when one or more query string parameters fail validation. */
export const INVALID_QUERY_PARAMETER_CODE = 'INVALID_QUERY_PARAMETER';

/** Human-readable message paired with {@link INVALID_QUERY_PARAMETER_CODE}. */
export const INVALID_QUERY_PARAMETER_MESSAGE = 'One or more query parameters are invalid.';

/** One field-level explanation of why a request was rejected. */
export interface ApiErrorDetail {
	readonly field: string;
	readonly message: string;
}

/** The single error envelope every agentCourses endpoint returns on failure. */
export interface ApiErrorBody {
	readonly error: {
		readonly code: string;
		readonly message: string;
		readonly details: readonly ApiErrorDetail[];
	};
}

export function invalidQueryParameterError(details: readonly ApiErrorDetail[]): ApiErrorBody {
	return {
		error: {
			code: INVALID_QUERY_PARAMETER_CODE,
			message: INVALID_QUERY_PARAMETER_MESSAGE,
			details,
		},
	};
}
