import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CourseItem {
	id: string;
	title: string;
	modality: string;
	status: string;
	createdAt: string;
	updatedAt: string;
}

interface CoursePageBody {
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
		details: { field: string; message: string }[];
	};
}

const actor = () => actorCalled('API client');

const coursePage = Question.about('the courses page', async (currentActor) => currentActor.answer(LastResponse.body<CoursePageBody>()));

const errorBody = Question.about('the error body', async (currentActor) => currentActor.answer(LastResponse.body<ErrorBody>()));

When('the client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the courses page is {int}', (page: number) => actor().attemptsTo(Ensure.that(resolved(pageNumber()), equals(page))));

Then('the courses page size is {int}', (pageSize: number) => actor().attemptsTo(Ensure.that(resolved(pageSizeValue()), equals(pageSize))));

Then('the courses total is {int}', (total: number) => actor().attemptsTo(Ensure.that(resolved(totalItems()), equals(total))));

Then('the courses page count is {int}', (totalPages: number) => actor().attemptsTo(Ensure.that(resolved(pageCount()), equals(totalPages))));

Then('the courses page contains {int} items', (count: number) => actor().attemptsTo(Ensure.that(resolved(itemCount()), equals(count))));

Then('the first course is {string}', (id: string) => actor().attemptsTo(Ensure.that(resolved(firstCourseId()), equals(id))));

Then('the course ids are {string}', (expected: string) => actor().attemptsTo(Ensure.that(resolved(courseIds()), equals(expected))));

Then('every course {string} is {string}', (field: string, value: string) => actor().attemptsTo(Ensure.that(resolved(everyCourseField(field, value)), equals(true))));

Then('the courses are sorted by {word}', (field: string) => actor().attemptsTo(Ensure.that(resolved(sortedBy(field)), equals(true))));

Then('the error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(errorCode()), equals(code))));

Then('the error message is {string}', (message: string) => actor().attemptsTo(Ensure.that(resolved(errorMessage()), equals(message))));

Then('the error details include field {string}', (field: string) => actor().attemptsTo(Ensure.that(resolved(errorHasField(field)), equals(true))));

function pageNumber() {
	return Question.about('the page number', async (currentActor) => (await currentActor.answer(coursePage)).page);
}

function pageSizeValue() {
	return Question.about('the page size', async (currentActor) => (await currentActor.answer(coursePage)).pageSize);
}

function totalItems() {
	return Question.about('the total items', async (currentActor) => (await currentActor.answer(coursePage)).totalItems);
}

function pageCount() {
	return Question.about('the page count', async (currentActor) => (await currentActor.answer(coursePage)).totalPages);
}

function itemCount() {
	return Question.about('the item count', async (currentActor) => (await currentActor.answer(coursePage)).items.length);
}

function firstCourseId() {
	return Question.about('the first course id', async (currentActor) => (await currentActor.answer(coursePage)).items[0]?.id ?? '');
}

function courseIds() {
	return Question.about('the course ids', async (currentActor) => (await currentActor.answer(coursePage)).items.map((course) => course.id).join(','));
}

function everyCourseField(field: string, value: string) {
	return Question.about(`every course ${field}`, async (currentActor) => {
		const page = await currentActor.answer(coursePage);
		if (field !== 'modality' && field !== 'status') {
			return false;
		}
		return page.items.length > 0 && page.items.every((course) => course[field] === value);
	});
}

function sortedBy(field: string) {
	return Question.about(`courses sorted by ${field}`, async (currentActor) => {
		if (field !== 'title' && field !== 'createdAt' && field !== 'updatedAt') {
			return false;
		}
		const values = (await currentActor.answer(coursePage)).items.map((course) => course[field]);
		const ordered = [...values].sort((left, right) => left.localeCompare(right, 'en'));
		return values.length > 1 && values.every((value, index) => value === ordered[index]);
	});
}

function errorCode() {
	return Question.about('the error code', async (currentActor) => (await currentActor.answer(errorBody)).error.code);
}

function errorMessage() {
	return Question.about('the error message', async (currentActor) => (await currentActor.answer(errorBody)).error.message);
}

function errorHasField(field: string) {
	return Question.about(`error field ${field}`, async (currentActor) => (await currentActor.answer(errorBody)).error.details.some((detail) => detail.field === field));
}
