/** Error code returned when one or more query string parameters fail validation. */
export const INVALID_QUERY_PARAMETER_CODE = 'INVALID_QUERY_PARAMETER' as const;

/** Human readable message paired with {@link INVALID_QUERY_PARAMETER_CODE}. */
export const INVALID_QUERY_PARAMETER_MESSAGE = 'One or more query parameters are invalid.' as const;

/** One field-scoped reason a request was rejected. */
export interface ApiErrorDetail {
	readonly field: string;
	readonly message: string;
}

/** Body of the consistent error envelope shared by every agentCourses REST route. */
export interface ApiErrorBody {
	readonly code: string;
	readonly message: string;
	readonly details: readonly ApiErrorDetail[];
}

/** Consistent error envelope shared by every agentCourses REST route. */
export interface ApiErrorResponse {
	readonly error: ApiErrorBody;
}

/** Builds the `INVALID_QUERY_PARAMETER` envelope returned with HTTP 400. */
export function invalidQueryParameterResponse(details: readonly ApiErrorDetail[]): ApiErrorResponse {
	return {
		error: {
			code: INVALID_QUERY_PARAMETER_CODE,
			message: INVALID_QUERY_PARAMETER_MESSAGE,
			details: [...details],
		},
	};
}
