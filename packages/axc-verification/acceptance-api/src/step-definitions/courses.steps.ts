import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CourseListBody {
	items: { id: string; title: string }[];
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

const numberField = (field: 'page' | 'pageSize' | 'totalItems' | 'totalPages') =>
	Question.about(`the course catalog ${field}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseListBody>());
		return body[field];
	});

const itemCount = Question.about('the course catalog item count', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CourseListBody>());
	return body.items.length;
});

const firstTitle = Question.about('the first course title', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CourseListBody>());
	return body.items[0]?.title ?? '';
});

const titles = Question.about('the course titles', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CourseListBody>());
	return body.items.map((item) => item.title);
});

const errorField = (field: 'code' | 'message') =>
	Question.about(`the course catalog error ${field}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseErrorBody>());
		return body.error[field];
	});

const pageSizeDetail = Question.about('the pageSize error detail', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CourseErrorBody>());
	return body.error.details.find((detail) => detail.field === 'pageSize')?.message ?? '';
});

When('the client requests the course catalog', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses'))));

When('the client searches active online courses for {string}', (keyword: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?q=${keyword}&modality=online&status=active`))));

When('the client requests the course catalog with page size {int}', (pageSize: number) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?pageSize=${pageSize}`))));

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course catalog returns the default page', () =>
	actor().attemptsTo(
		Ensure.that(resolved(numberField('page')), equals(1)),
		Ensure.that(resolved(numberField('pageSize')), equals(10)),
		Ensure.that(resolved(numberField('totalItems')), equals(12)),
		Ensure.that(resolved(numberField('totalPages')), equals(2)),
		Ensure.that(resolved(itemCount), equals(10)),
		Ensure.that(resolved(firstTitle), equals('Accessibility Fundamentals')),
	),
);

Then('the course catalog returns the security online active courses', () =>
	actor().attemptsTo(
		Ensure.that(resolved(titles), equals(['AI Security Foundations', 'Incident Response'])),
		Ensure.that(resolved(numberField('totalItems')), equals(2)),
		Ensure.that(resolved(numberField('totalPages')), equals(1)),
	),
);

Then('the course catalog rejects the page size', () =>
	actor().attemptsTo(
		Ensure.that(resolved(errorField('code')), equals('INVALID_QUERY_PARAMETER')),
		Ensure.that(resolved(errorField('message')), equals('One or more query parameters are invalid.')),
		Ensure.that(resolved(pageSizeDetail), equals('pageSize must be between 1 and 50.')),
	),
);
