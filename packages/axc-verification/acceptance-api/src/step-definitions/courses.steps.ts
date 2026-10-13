import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CoursePageBody {
	items: Array<{ id: string }>;
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface CourseErrorBody {
	error: {
		code: string;
		message: string;
		details: Array<{ field: string; message: string }>;
	};
}

const actor = () => actorCalled('API client');

const coursePageField = <K extends keyof CoursePageBody>(field: K) =>
	Question.about(`the course catalog ${field}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CoursePageBody>());
		return body[field];
	});

const courseItemCount = Question.about('the course catalog item count', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CoursePageBody>());
	return body.items.length;
});

const courseItemIds = Question.about('the course catalog item ids', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CoursePageBody>());
	return body.items.map((item) => item.id).join(',');
});

const firstCourseId = Question.about('the first course id', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CoursePageBody>());
	return body.items[0]?.id ?? '';
});

const courseErrorCode = Question.about('the course catalog error code', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CourseErrorBody>());
	return body.error.code;
});

When('the client requests the course path {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course catalog page is {int}', (page: number) => actor().attemptsTo(Ensure.that(resolved(coursePageField('page')), equals(page))));

Then('the course catalog page size is {int}', (pageSize: number) => actor().attemptsTo(Ensure.that(resolved(coursePageField('pageSize')), equals(pageSize))));

Then('the course catalog returns {int} items', (count: number) => actor().attemptsTo(Ensure.that(resolved(courseItemCount), equals(count))));

Then('the course catalog total items are {int}', (totalItems: number) => actor().attemptsTo(Ensure.that(resolved(coursePageField('totalItems')), equals(totalItems))));

Then('the course catalog total pages are {int}', (totalPages: number) => actor().attemptsTo(Ensure.that(resolved(coursePageField('totalPages')), equals(totalPages))));

Then('the course catalog item ids are {string}', (ids: string) => actor().attemptsTo(Ensure.that(resolved(courseItemIds), equals(ids))));

Then('the first course id is {string}', (id: string) => actor().attemptsTo(Ensure.that(resolved(firstCourseId), equals(id))));

Then('the course catalog error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(courseErrorCode), equals(code))));

Then('the course catalog error field {string} says {string}', (field: string, message: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`the ${field} error message`, async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseErrorBody>());
					return body.error.details.find((detail) => detail.field === field)?.message ?? '';
				}),
			),
			equals(message),
		),
	),
);
