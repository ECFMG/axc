import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CoursePage {
	items: { id: string; modality: string }[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface CourseError {
	error: { code: string; message: string; details: { field: string; message: string }[] };
}

const actor = () => actorCalled('API client');

const coursePage = <T>(description: string, read: (body: CoursePage) => T) => Question.about(description, async (currentActor) => read(await currentActor.answer(LastResponse.body<CoursePage>())));

When('the client searches the course catalog with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(query === '' ? '/api/courses' : `/api/courses?${query}`))));

Then('the course search responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course page reports page {int} with page size {int}', (page: number, pageSize: number) =>
	actor().attemptsTo(Ensure.that(resolved(coursePage('the page number', (body) => body.page)), equals(page)), Ensure.that(resolved(coursePage('the page size', (body) => body.pageSize)), equals(pageSize))),
);

Then('the course page contains {int} items', (count: number) => actor().attemptsTo(Ensure.that(resolved(coursePage('the item count', (body) => body.items.length)), equals(count))));

Then('the course page items all have modality {string}', (modality: string) =>
	actor().attemptsTo(Ensure.that(resolved(coursePage('the modalities', (body) => body.items.every((item) => item.modality === modality))), equals(true))),
);

Then('the course error reports the invalid field {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the invalid fields', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseError>());
					return `${body.error.code}:${body.error.details.map((detail) => detail.field).join(',')}`;
				}),
			),
			equals(`INVALID_QUERY_PARAMETER:${field}`),
		),
	),
);
