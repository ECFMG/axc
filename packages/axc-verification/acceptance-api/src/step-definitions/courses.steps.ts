import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CoursePageBody {
	items: { id: string }[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface QueryErrorBody {
	error: {
		code: string;
		message: string;
		details: { field: string; message: string }[];
	};
}

const actor = () => actorCalled('API client');

const coursePage = Question.about('the course page', async (currentActor) => currentActor.answer(LastResponse.body<CoursePageBody>()));

const courseIds = Question.about('the course ids', async (currentActor) => {
	const body = await currentActor.answer(coursePage);
	return body.items.map((item) => item.id).join(',');
});

const courseCount = Question.about('the course count', async (currentActor) => {
	const body = await currentActor.answer(coursePage);
	return body.items.length;
});

const pageNumber = Question.about('the page number', async (currentActor) => (await currentActor.answer(coursePage)).page);
const pageSize = Question.about('the page size', async (currentActor) => (await currentActor.answer(coursePage)).pageSize);
const totalItems = Question.about('the total items', async (currentActor) => (await currentActor.answer(coursePage)).totalItems);
const totalPages = Question.about('the total pages', async (currentActor) => (await currentActor.answer(coursePage)).totalPages);

const errorBody = Question.about('the error body', async (currentActor) => currentActor.answer(LastResponse.body<QueryErrorBody>()));

const errorFields = Question.about('the error fields', async (currentActor) => {
	const body = await currentActor.answer(errorBody);
	return body.error.details.map((detail) => detail.field).join(',');
});

When('the client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course ids are {string}', (expected: string) => actor().attemptsTo(Ensure.that(resolved(courseIds), equals(expected))));

Then('the course page contains {int} courses', (count: number) => actor().attemptsTo(Ensure.that(resolved(courseCount), equals(count))));

Then('the course page contains no courses', () => actor().attemptsTo(Ensure.that(resolved(courseCount), equals(0))));

Then('the course page reports page {int}, page size {int}, total items {int}, and total pages {int}', (page: number, size: number, items: number, pages: number) =>
	actor().attemptsTo(Ensure.that(resolved(pageNumber), equals(page)), Ensure.that(resolved(pageSize), equals(size)), Ensure.that(resolved(totalItems), equals(items)), Ensure.that(resolved(totalPages), equals(pages))),
);

Then('the invalid query error for {string} says {string}', (field: string, message: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the error code', async (currentActor) => {
					const body = await currentActor.answer(errorBody);
					return body.error.code;
				}),
			),
			equals('INVALID_QUERY_PARAMETER'),
		),
		Ensure.that(
			resolved(
				Question.about('the error message', async (currentActor) => {
					const body = await currentActor.answer(errorBody);
					return body.error.message;
				}),
			),
			equals('One or more query parameters are invalid.'),
		),
		Ensure.that(
			resolved(
				Question.about(`the ${field} error`, async (currentActor) => {
					const body = await currentActor.answer(errorBody);
					return body.error.details.find((detail) => detail.field === field)?.message ?? '';
				}),
			),
			equals(message),
		),
	),
);

Then('the error fields are {string}', (fields: string) => actor().attemptsTo(Ensure.that(resolved(errorFields), equals(fields))));
