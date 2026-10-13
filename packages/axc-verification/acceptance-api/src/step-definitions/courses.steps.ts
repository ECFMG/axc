import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CourseItem {
	id: string;
}

interface CoursePage {
	items: CourseItem[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface CourseErrorBody {
	error: {
		code: string;
		details: { field: string }[];
	};
}

const actor = () => actorCalled('API client');

const coursePage = Question.about('the course catalog page', async (currentActor) => currentActor.answer(LastResponse.body<CoursePage>()));

const courseField = <K extends 'page' | 'pageSize' | 'totalItems' | 'totalPages'>(field: K) =>
	Question.about(`the course ${field}`, async (currentActor) => {
		const body = await currentActor.answer(coursePage);
		return body[field];
	});

const courseIds = Question.about('the course ids', async (currentActor) => {
	const body = await currentActor.answer(coursePage);
	return body.items.map((item) => item.id).join(',');
});

const courseError = Question.about('the course error', async (currentActor) => currentActor.answer(LastResponse.body<CourseErrorBody>()));

When('the client requests the course catalog at {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course page is {int}', (page: number) => actor().attemptsTo(Ensure.that(resolved(courseField('page')), equals(page))));

Then('the course page size is {int}', (pageSize: number) => actor().attemptsTo(Ensure.that(resolved(courseField('pageSize')), equals(pageSize))));

Then('the course total items is {int}', (totalItems: number) => actor().attemptsTo(Ensure.that(resolved(courseField('totalItems')), equals(totalItems))));

Then('the course total pages is {int}', (totalPages: number) => actor().attemptsTo(Ensure.that(resolved(courseField('totalPages')), equals(totalPages))));

Then('the course ids are {string}', (expected: string) => actor().attemptsTo(Ensure.that(resolved(courseIds), equals(expected))));

Then('the course error code is {string}', (code: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the course error code', async (currentActor) => {
					const body = await currentActor.answer(courseError);
					return body.error.code;
				}),
			),
			equals(code),
		),
	),
);

Then('the course error fields are {string}', (expected: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the course error fields', async (currentActor) => {
					const body = await currentActor.answer(courseError);
					return body.error.details.map((detail) => detail.field).join(',');
				}),
			),
			equals(expected),
		),
	),
);
