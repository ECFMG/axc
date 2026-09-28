import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals, isGreaterThan, isLessThan, isTrue } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface Course {
	id: string;
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

interface CourseListResponse {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface ErrorResponse {
	error: {
		code: string;
		message: string;
		details: Array<{ field: string; message: string }>;
	};
}

const actor = () => actorCalled('API client');

const courseList = () =>
	Question.about('the course list body', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<CourseListResponse>());
	});

const errorBody = () =>
	Question.about('the error body', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<ErrorResponse>());
	});

When('the client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course list page is {int}', async (page: number) => {
	const body = await actor().answer(courseList());
	await actor().attemptsTo(Ensure.that(body.page, equals(page)));
});

Then('the course list pageSize is {int}', async (pageSize: number) => {
	const body = await actor().answer(courseList());
	await actor().attemptsTo(Ensure.that(body.pageSize, equals(pageSize)));
});

Then('the course list has at most {int} items', async (maxItems: number) => {
	const body = await actor().answer(courseList());
	await actor().attemptsTo(Ensure.that(body.items.length, isLessThan(maxItems + 1)));
});

Then('the course list totalItems is at least {int}', async (minimum: number) => {
	const body = await actor().answer(courseList());
	await actor().attemptsTo(Ensure.that(body.totalItems, isGreaterThan(minimum - 1)));
});

Then('the course list totalItems is {int}', async (totalItems: number) => {
	const body = await actor().answer(courseList());
	await actor().attemptsTo(Ensure.that(body.totalItems, equals(totalItems)));
});

Then('the course list totalPages matches the item count', async () => {
	const body = await actor().answer(courseList());
	await actor().attemptsTo(Ensure.that(body.totalPages, equals(Math.ceil(body.totalItems / body.pageSize))));
});

Then('every course matches keyword {string}', async (keyword: string) => {
	const body = await actor().answer(courseList());
	const needle = keyword.toLowerCase();
	const unmatched = body.items.filter((course) => !(course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle) || course.tags.some((tag) => tag.toLowerCase().includes(needle))));
	await actor().attemptsTo(Ensure.that(unmatched.length, equals(0)));
	await actor().attemptsTo(Ensure.that(body.items.length, isGreaterThan(0)));
});

Then('every course has modality {string}', async (modality: string) => {
	const body = await actor().answer(courseList());
	await actor().attemptsTo(
		Ensure.that(
			body.items.every((course) => course.modality === modality),
			isTrue(),
		),
	);
	await actor().attemptsTo(Ensure.that(body.items.length, isGreaterThan(0)));
});

Then('every course has status {string}', async (status: string) => {
	const body = await actor().answer(courseList());
	await actor().attemptsTo(
		Ensure.that(
			body.items.every((course) => course.status === status),
			isTrue(),
		),
	);
	await actor().attemptsTo(Ensure.that(body.items.length, isGreaterThan(0)));
});

Then('every course has tag {string}', async (tag: string) => {
	const body = await actor().answer(courseList());
	const needle = tag.toLowerCase();
	await actor().attemptsTo(
		Ensure.that(
			body.items.every((course) => course.tags.some((courseTag) => courseTag.toLowerCase() === needle)),
			isTrue(),
		),
	);
	await actor().attemptsTo(Ensure.that(body.items.length, isGreaterThan(0)));
});

Then('the course list contains only ids {string}', async (ids: string) => {
	const body = await actor().answer(courseList());
	await actor().attemptsTo(Ensure.that(body.items.map((course) => course.id).join(','), equals(ids)));
});

Then('the course list is sorted by {string}', async (field: string) => {
	const body = await actor().answer(courseList());
	const values = body.items.map((course) => {
		if (field === 'createdAt') {
			return course.createdAt;
		}
		if (field === 'updatedAt') {
			return course.updatedAt;
		}
		return course.title;
	});
	await actor().attemptsTo(Ensure.that(values, equals([...values].sort())));
});

Then('the error code is {string}', async (code: string) => {
	const body = await actor().answer(errorBody());
	await actor().attemptsTo(Ensure.that(body.error.code, equals(code)));
});

Then('the error details include field {string}', async (field: string) => {
	const body = await actor().answer(errorBody());
	await actor().attemptsTo(
		Ensure.that(
			body.error.details.some((detail) => detail.field === field),
			isTrue(),
		),
	);
});

Then('the course list is empty', async () => {
	const body = await actor().answer(courseList());
	await actor().attemptsTo(Ensure.that(body.items.length, equals(0)));
});
