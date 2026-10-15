import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CourseItem {
	id: string;
	title: string;
	modality: string;
	status: string;
}

interface CourseListBody {
	items: CourseItem[];
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

const courseNumber = (field: 'page' | 'pageSize' | 'totalItems' | 'totalPages') =>
	Question.about(`the course catalog ${field}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseListBody>());
		return body[field];
	});

const courseIdList = Question.about('the course ids', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CourseListBody>());
	return body.items.map((item) => item.id).join(',');
});

const courseCount = Question.about('the course count', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CourseListBody>());
	return body.items.length;
});

const everyCourseField = (field: 'modality' | 'status', expected: string) =>
	Question.about(`every course ${field} is ${expected}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseListBody>());
		return body.items.every((item) => item[field] === expected);
	});

const courseTitle = (id: string) =>
	Question.about(`the title of ${id}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseListBody>());
		const course = body.items.find((item) => item.id === id);
		return course?.title ?? '';
	});

const errorCode = Question.about('the course catalog error code', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CourseErrorBody>());
	return body.error.code;
});

const errorMessage = Question.about('the course catalog error message', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CourseErrorBody>());
	return body.error.message;
});

const errorDetail = (field: string) =>
	Question.about(`the course catalog error detail for ${field}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseErrorBody>());
		const detail = body.error.details.find((item) => item.field === field);
		return detail?.message ?? '';
	});

When('the client requests the course catalog', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses'))));

When('the client requests the course catalog with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course catalog page is {int}', (page: number) => actor().attemptsTo(Ensure.that(resolved(courseNumber('page')), equals(page))));

Then('the course catalog page size is {int}', (pageSize: number) => actor().attemptsTo(Ensure.that(resolved(courseNumber('pageSize')), equals(pageSize))));

Then('the course catalog total items is {int}', (totalItems: number) => actor().attemptsTo(Ensure.that(resolved(courseNumber('totalItems')), equals(totalItems))));

Then('the course catalog total pages is {int}', (totalPages: number) => actor().attemptsTo(Ensure.that(resolved(courseNumber('totalPages')), equals(totalPages))));

Then('the course catalog returns {int} courses', (count: number) => actor().attemptsTo(Ensure.that(resolved(courseCount), equals(count))));

Then('the course ids are {string}', (ids: string) => actor().attemptsTo(Ensure.that(resolved(courseIdList), equals(ids))));

Then('every course modality is {string}', (modality: string) => actor().attemptsTo(Ensure.that(resolved(everyCourseField('modality', modality)), equals(true))));

Then('every course status is {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(everyCourseField('status', status)), equals(true))));

Then('course {string} is titled {string}', (id: string, title: string) => actor().attemptsTo(Ensure.that(resolved(courseTitle(id)), equals(title))));

Then('the course catalog error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(errorCode), equals(code))));

Then('the course catalog error message is {string}', (message: string) => actor().attemptsTo(Ensure.that(resolved(errorMessage), equals(message))));

Then('the course catalog error detail for {string} is {string}', (field: string, message: string) => actor().attemptsTo(Ensure.that(resolved(errorDetail(field)), equals(message))));
