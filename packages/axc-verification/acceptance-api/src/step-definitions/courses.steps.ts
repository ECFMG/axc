import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CourseListResponse {
	items: { id: string }[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface CourseErrorResponse {
	error: {
		code: string;
		message: string;
		details: { field: string; message: string }[];
	};
}

const actor = () => actorCalled('API client');

const courseField = <K extends keyof CourseListResponse>(field: K) =>
	Question.about(`the course catalog ${field}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseListResponse>());
		return body[field];
	});

const courseIds = () =>
	Question.about('the course ids', async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseListResponse>());
		return body.items.map((item) => item.id).join(',');
	});

const errorField = (field: 'code' | 'message') =>
	Question.about(`the course catalog error ${field}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseErrorResponse>());
		return body.error[field];
	});

const errorDetail = (field: string) =>
	Question.about(`the course catalog error for ${field}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseErrorResponse>());
		return body.error.details.find((detail) => detail.field === field)?.message ?? '';
	});

When('the client requests the course catalog', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses'))));

When('the client requests the course catalog with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course catalog page is {int}', (page: number) => actor().attemptsTo(Ensure.that(resolved(courseField('page')), equals(page))));

Then('the course catalog page size is {int}', (pageSize: number) => actor().attemptsTo(Ensure.that(resolved(courseField('pageSize')), equals(pageSize))));

Then('the course catalog total is {int}', (totalItems: number) => actor().attemptsTo(Ensure.that(resolved(courseField('totalItems')), equals(totalItems))));

Then('the course catalog total pages are {int}', (totalPages: number) => actor().attemptsTo(Ensure.that(resolved(courseField('totalPages')), equals(totalPages))));

Then('the course ids are {string}', (expected: string) => actor().attemptsTo(Ensure.that(resolved(courseIds()), equals(expected))));

Then('the course catalog error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(errorField('code')), equals(code))));

Then('the course catalog error message is {string}', (message: string) => actor().attemptsTo(Ensure.that(resolved(errorField('message')), equals(message))));

Then('the course catalog error for {string} says {string}', (field: string, message: string) => actor().attemptsTo(Ensure.that(resolved(errorDetail(field)), equals(message))));
