import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CoursePageBody {
	items: Array<{ title: string }>;
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

const courseNumber = (field: 'page' | 'pageSize' | 'totalItems' | 'totalPages') =>
	Question.about(`the course catalog ${field}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CoursePageBody>());
		return body[field];
	});

const courseCount = Question.about('the course count', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CoursePageBody>());
	return body.items.length;
});

const courseTitles = Question.about('the course titles', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CoursePageBody>());
	return body.items.map((item) => item.title).join(', ');
});

const firstCourseTitle = Question.about('the first course title', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CoursePageBody>());
	const first = body.items[0];
	return first === undefined ? '' : first.title;
});

const courseErrorCode = Question.about('the course error code', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CourseErrorBody>());
	return body.error.code;
});

const courseErrorMessage = Question.about('the course error message', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CourseErrorBody>());
	return body.error.message;
});

const courseErrorDetail = (field: string) =>
	Question.about(`the ${field} error`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseErrorBody>());
		const detail = body.error.details.find((item) => item.field === field);
		return detail === undefined ? '' : detail.message;
	});

When('the client requests the course catalog', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses'))));

When('the client requests the course catalog with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course catalog page is {int}', (page: number) => actor().attemptsTo(Ensure.that(resolved(courseNumber('page')), equals(page))));

Then('the course catalog page size is {int}', (pageSize: number) => actor().attemptsTo(Ensure.that(resolved(courseNumber('pageSize')), equals(pageSize))));

Then('the course catalog contains {int} courses', (count: number) => actor().attemptsTo(Ensure.that(resolved(courseCount), equals(count))));

Then('the course catalog total is {int}', (total: number) => actor().attemptsTo(Ensure.that(resolved(courseNumber('totalItems')), equals(total))));

Then('the course catalog total pages are {int}', (totalPages: number) => actor().attemptsTo(Ensure.that(resolved(courseNumber('totalPages')), equals(totalPages))));

Then('the course titles are {string}', (titles: string) => actor().attemptsTo(Ensure.that(resolved(courseTitles), equals(titles))));

Then('the first course is {string}', (title: string) => actor().attemptsTo(Ensure.that(resolved(firstCourseTitle), equals(title))));

Then('the course catalog rejects the query', () =>
	actor().attemptsTo(
		Ensure.that(resolved(LastResponse.status()), equals(400)),
		Ensure.that(resolved(courseErrorCode), equals('INVALID_QUERY_PARAMETER')),
		Ensure.that(resolved(courseErrorMessage), equals('One or more query parameters are invalid.')),
	),
);

Then('the course catalog error field {string} says {string}', (field: string, message: string) => actor().attemptsTo(Ensure.that(resolved(courseErrorDetail(field)), equals(message))));
