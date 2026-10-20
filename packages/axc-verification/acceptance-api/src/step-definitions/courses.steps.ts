import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CourseItem {
	id: string;
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

interface CourseListBody {
	items: CourseItem[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface ErrorBody {
	error: {
		code: string;
		message: string;
		details: Array<{ field: string; message: string }>;
	};
}

const actor = () => actorCalled('API client');

const courseList = () =>
	Question.about('the course list', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<CourseListBody>());
	});

const courseField = <K extends 'page' | 'pageSize' | 'totalItems' | 'totalPages'>(field: K) =>
	Question.about(`the course ${field}`, async (currentActor) => {
		const body = await currentActor.answer(courseList());
		return body[field];
	});

const courseItemCount = () =>
	Question.about('the course item count', async (currentActor) => {
		const body = await currentActor.answer(courseList());
		return body.items.length;
	});

const firstCourseField = (field: 'id' | 'title') =>
	Question.about(`the first course ${field}`, async (currentActor) => {
		const body = await currentActor.answer(courseList());
		const first = body.items[0];
		if (first === undefined) {
			throw new Error('course page has no items');
		}
		return first[field];
	});

const courseIdsInclude = (id: string) =>
	Question.about(`whether course ids include ${id}`, async (currentActor) => {
		const body = await currentActor.answer(courseList());
		return body.items.some((course) => course.id === id);
	});

const everyModalityIs = (modality: string) =>
	Question.about(`whether every modality is ${modality}`, async (currentActor) => {
		const body = await currentActor.answer(courseList());
		return body.items.every((course) => course.modality === modality);
	});

const everyStatusIs = (status: string) =>
	Question.about(`whether every status is ${status}`, async (currentActor) => {
		const body = await currentActor.answer(courseList());
		return body.items.every((course) => course.status === status);
	});

const everyCourseHasTag = (tag: string) =>
	Question.about(`whether every course has tag ${tag}`, async (currentActor) => {
		const expected = tag.toLocaleLowerCase('en');
		const body = await currentActor.answer(courseList());
		return body.items.every((course) => course.tags.some((courseTag) => courseTag.toLocaleLowerCase('en') === expected));
	});

const everyCourseMatchesKeyword = (keyword: string) =>
	Question.about(`whether every course matches ${keyword}`, async (currentActor) => {
		const needle = keyword.toLocaleLowerCase('en');
		const body = await currentActor.answer(courseList());
		return body.items.every((course) => [course.title, course.summary, ...course.tags].some((value) => value.toLocaleLowerCase('en').includes(needle)));
	});

const createdAtIsAscending = () =>
	Question.about('whether createdAt is ascending', async (currentActor) => {
		const body = await currentActor.answer(courseList());
		for (let index = 1; index < body.items.length; index += 1) {
			const previous = body.items[index - 1];
			const current = body.items[index];
			if (previous === undefined || current === undefined || previous.createdAt > current.createdAt) {
				return false;
			}
		}
		return true;
	});

const errorBody = () =>
	Question.about('the error body', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<ErrorBody>());
	});

const errorCode = () =>
	Question.about('the error code', async (currentActor) => {
		const body = await currentActor.answer(errorBody());
		return body.error.code;
	});

const errorMessage = () =>
	Question.about('the error message', async (currentActor) => {
		const body = await currentActor.answer(errorBody());
		return body.error.message;
	});

const errorIncludesField = (field: string) =>
	Question.about(`whether error details include ${field}`, async (currentActor) => {
		const body = await currentActor.answer(errorBody());
		return body.error.details.some((detail) => detail.field === field);
	});

const errorDetailMessage = (field: string) =>
	Question.about(`the error detail for ${field}`, async (currentActor) => {
		const body = await currentActor.answer(errorBody());
		const detail = body.error.details.find((item) => item.field === field);
		if (detail === undefined) {
			throw new Error(`missing error detail for ${field}`);
		}
		return detail.message;
	});

When('the client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course page is {int}', (page: number) => actor().attemptsTo(Ensure.that(resolved(courseField('page')), equals(page))));

Then('the course page size is {int}', (pageSize: number) => actor().attemptsTo(Ensure.that(resolved(courseField('pageSize')), equals(pageSize))));

Then('the course page has {int} items', (count: number) => actor().attemptsTo(Ensure.that(resolved(courseItemCount()), equals(count))));

Then('the course total items is {int}', (totalItems: number) => actor().attemptsTo(Ensure.that(resolved(courseField('totalItems')), equals(totalItems))));

Then('the course total pages is {int}', (totalPages: number) => actor().attemptsTo(Ensure.that(resolved(courseField('totalPages')), equals(totalPages))));

Then('the first course id is {string}', (id: string) => actor().attemptsTo(Ensure.that(resolved(firstCourseField('id')), equals(id))));

Then('the first course title is {string}', (title: string) => actor().attemptsTo(Ensure.that(resolved(firstCourseField('title')), equals(title))));

Then('the course ids include {string}', (id: string) => actor().attemptsTo(Ensure.that(resolved(courseIdsInclude(id)), equals(true))));

Then('every course modality is {string}', (modality: string) => actor().attemptsTo(Ensure.that(resolved(everyModalityIs(modality)), equals(true))));

Then('every course status is {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(everyStatusIs(status)), equals(true))));

Then('every course has a tag {string}', (tag: string) => actor().attemptsTo(Ensure.that(resolved(everyCourseHasTag(tag)), equals(true))));

Then('every course matches the keyword {string}', (keyword: string) => actor().attemptsTo(Ensure.that(resolved(everyCourseMatchesKeyword(keyword)), equals(true))));

Then('the courses are sorted by createdAt ascending', () => actor().attemptsTo(Ensure.that(resolved(createdAtIsAscending()), equals(true))));

Then('the error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(errorCode()), equals(code))));

Then('the error message is {string}', (message: string) => actor().attemptsTo(Ensure.that(resolved(errorMessage()), equals(message))));

Then('the error details include field {string}', (field: string) => actor().attemptsTo(Ensure.that(resolved(errorIncludesField(field)), equals(true))));

Then('the error detail for {string} says {string}', (field: string, message: string) => actor().attemptsTo(Ensure.that(resolved(errorDetailMessage(field)), equals(message))));
