/** Shared Screenplay questions over the last agentCourses API response. */

import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

/** The actor driving every API acceptance scenario. */
export const apiClient = () => actorCalled('API client');

/** Standard justification used whenever a scenario does not supply its own. */
export const DEFAULT_JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';

/** Reviewer recorded against status changes made in acceptance scenarios. */
export const REVIEWER = 'reviewer@example.org';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

/** Error body returned by every agentCourses endpoint when a request is refused. */
interface ApiErrorBody {
	error?: { code?: string; message?: string; details?: { field: string; message: string }[] };
}

/** The HTTP status of the last response. */
export const responseStatus = () => resolved(LastResponse.status());

/** Builds a question over the parsed body of the last response. */
export function bodyQuestion<T, R>(description: string, extract: (body: T) => R): Answerable<R> {
	return Question.about(description, async (actor) => {
		const body = await actor.answer(LastResponse.body<T>());
		return extract(body);
	});
}

/** The `error.code` of the last response. */
export const responseErrorCode = () => bodyQuestion<ApiErrorBody, string>('the response error code', (body) => body.error?.code ?? '');
