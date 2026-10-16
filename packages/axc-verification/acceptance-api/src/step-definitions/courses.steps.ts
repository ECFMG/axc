import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CourseListBody {
	items: {
		id: string;
		title: string;
		modality: string;
		status: string;
	}[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface CourseErrorBody {
	error: {
		code: string;
		message: string;
		details: { field: string; message: string }[];
	};
}

const actor = () => actorCalled('API client');

const listField = <K extends keyof CourseListBody>(field: K) =>
	Question.about(`the course ${field}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseListBody>());
		return body[field];
	});

const itemCount = Question.about('the course item count', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CourseListBody>());
	return body.items.length;
});

const firstItemField = (field: 'id' | 'title' | 'modality' | 'status') =>
	Question.about(`the first course ${field}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseListBody>());
		const item = body.items[0];
		if (item === undefined) {
			throw new Error('course list is empty');
		}
		return item[field];
	});

const errorField = (field: 'code' | 'message') =>
	Question.about(`the course error ${field}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseErrorBody>());
		return body.error[field];
	});

const firstDetailField = (field: 'field' | 'message') =>
	Question.about(`the first course error ${field}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseErrorBody>());
		const detail = body.error.details[0];
		if (detail === undefined) {
			throw new Error('course error has no details');
		}
		return detail[field];
	});

When('the client requests the course catalog', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses'))));

When('the client requests the course catalog with query {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course catalog returns the default page', () =>
	actor().attemptsTo(
		Ensure.that(resolved(listField('page')), equals(1)),
		Ensure.that(resolved(listField('pageSize')), equals(10)),
		Ensure.that(resolved(listField('totalItems')), equals(12)),
		Ensure.that(resolved(listField('totalPages')), equals(2)),
		Ensure.that(resolved(itemCount), equals(10)),
		Ensure.that(resolved(firstItemField('title')), equals('Active Listening')),
	),
);

Then('the course catalog returns the online active security course', () =>
	actor().attemptsTo(
		Ensure.that(resolved(itemCount), equals(1)),
		Ensure.that(resolved(firstItemField('id')), equals('course-001')),
		Ensure.that(resolved(firstItemField('title')), equals('AI Security Foundations')),
		Ensure.that(resolved(firstItemField('modality')), equals('online')),
		Ensure.that(resolved(firstItemField('status')), equals('active')),
	),
);

Then('the course catalog rejects the page size', () =>
	actor().attemptsTo(
		Ensure.that(resolved(errorField('code')), equals('INVALID_QUERY_PARAMETER')),
		Ensure.that(resolved(errorField('message')), equals('One or more query parameters are invalid.')),
		Ensure.that(resolved(firstDetailField('field')), equals('pageSize')),
		Ensure.that(resolved(firstDetailField('message')), equals('pageSize must be between 1 and 50.')),
	),
);
