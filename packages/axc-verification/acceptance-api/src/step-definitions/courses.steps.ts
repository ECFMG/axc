import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CoursePage {
	items: { id: string; title: string }[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface ErrorBody {
	error: {
		code: string;
		message: string;
		details: { field: string; message: string }[];
	};
}

const actor = () => actorCalled('API client');

const coursePage = () => Question.about('the course page', (currentActor) => currentActor.answer(LastResponse.body<CoursePage>()));

const courseField = <K extends 'page' | 'pageSize' | 'totalItems' | 'totalPages'>(field: K) =>
	Question.about(`the course ${field}`, async (currentActor) => {
		const body = await currentActor.answer(coursePage());
		return body[field];
	});

const itemCount = () =>
	Question.about('the course item count', async (currentActor) => {
		const body = await currentActor.answer(coursePage());
		return body.items.length;
	});

const firstTitle = () =>
	Question.about('the first course title', async (currentActor) => {
		const body = await currentActor.answer(coursePage());
		return body.items[0]?.title ?? '';
	});

const titlesAreSorted = () =>
	Question.about('course titles sorted ascending', async (currentActor) => {
		const body = await currentActor.answer(coursePage());
		const titles = body.items.map((item) => item.title);
		const sorted = [...titles].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
		return titles.every((title, index) => title === sorted[index]);
	});

const onlyCourseId = () =>
	Question.about('the only course id', async (currentActor) => {
		const body = await currentActor.answer(coursePage());
		return body.items.length === 1 ? (body.items[0]?.id ?? '') : '';
	});

const errorBody = () => Question.about('the course error', (currentActor) => currentActor.answer(LastResponse.body<ErrorBody>()));

const errorCode = () =>
	Question.about('the course error code', async (currentActor) => {
		const body = await currentActor.answer(errorBody());
		return body.error.code;
	});

const errorMessage = () =>
	Question.about('the course error message', async (currentActor) => {
		const body = await currentActor.answer(errorBody());
		return body.error.message;
	});

const pageSizeDetail = () =>
	Question.about('the pageSize error detail', async (currentActor) => {
		const body = await currentActor.answer(errorBody());
		const detail = body.error.details.find((item) => item.field === 'pageSize');
		return detail?.message ?? '';
	});

When('the client requests the course catalog', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses'))));

When('the client searches active online courses for {string}', (keyword: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?q=${encodeURIComponent(keyword)}&modality=online&status=active`))));

When('the client requests the course catalog with page size {int}', (pageSize: number) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?pageSize=${pageSize}`))));

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course catalog returns the default first page', () =>
	actor().attemptsTo(
		Ensure.that(resolved(courseField('page')), equals(1)),
		Ensure.that(resolved(courseField('pageSize')), equals(10)),
		Ensure.that(resolved(courseField('totalItems')), equals(12)),
		Ensure.that(resolved(courseField('totalPages')), equals(2)),
		Ensure.that(resolved(itemCount()), equals(10)),
		Ensure.that(resolved(firstTitle()), equals('AI Product Studio')),
		Ensure.that(resolved(titlesAreSorted()), equals(true)),
	),
);

Then('the course catalog returns only AI Security Foundations', () => actor().attemptsTo(Ensure.that(resolved(onlyCourseId()), equals('course-001')), Ensure.that(resolved(courseField('totalItems')), equals(1))));

Then('the course catalog rejects the page size', () =>
	actor().attemptsTo(
		Ensure.that(resolved(errorCode()), equals('INVALID_QUERY_PARAMETER')),
		Ensure.that(resolved(errorMessage()), equals('One or more query parameters are invalid.')),
		Ensure.that(resolved(pageSizeDetail()), equals('pageSize must be between 1 and 50.')),
	),
);
