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
}

interface CoursePage {
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
		details: Array<{ field: string; message: string }>;
	};
}

const actor = () => actorCalled('API client');

const coursePage = () => resolved(LastResponse.body<CoursePage>());

const pageField = <K extends 'page' | 'pageSize' | 'totalItems' | 'totalPages'>(field: K) =>
	Question.about(`the course catalog ${field}`, async (currentActor) => {
		const body = await currentActor.answer(coursePage());
		return body[field];
	});

const courseIds = Question.about('the course ids', async (currentActor) => {
	const body = await currentActor.answer(coursePage());
	return body.items.map((course) => course.id).join(',');
});

const itemCount = Question.about('the course catalog item count', async (currentActor) => {
	const body = await currentActor.answer(coursePage());
	return body.items.length;
});

const errorBody = () => resolved(LastResponse.body<CourseErrorBody>());

const errorField = <K extends 'code' | 'message'>(field: K) =>
	Question.about(`the course catalog error ${field}`, async (currentActor) => {
		const body = await currentActor.answer(errorBody());
		return body.error[field];
	});

When('the client requests the course catalog', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses'))));

When('the client requests the course catalog at {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course catalog page is {int}', (page: number) => actor().attemptsTo(Ensure.that(resolved(pageField('page')), equals(page))));

Then('the course catalog page size is {int}', (pageSize: number) => actor().attemptsTo(Ensure.that(resolved(pageField('pageSize')), equals(pageSize))));

Then('the course catalog total items is {int}', (totalItems: number) => actor().attemptsTo(Ensure.that(resolved(pageField('totalItems')), equals(totalItems))));

Then('the course catalog total pages is {int}', (totalPages: number) => actor().attemptsTo(Ensure.that(resolved(pageField('totalPages')), equals(totalPages))));

Then('the course catalog item count is {int}', (count: number) => actor().attemptsTo(Ensure.that(resolved(itemCount), equals(count))));

Then('the course ids are {string}', (ids: string) => actor().attemptsTo(Ensure.that(resolved(courseIds), equals(ids))));

Then('every returned course matches keyword {string}', (keyword: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`courses matching ${keyword}`, async (currentActor) => {
					const body = await currentActor.answer(coursePage());
					const needle = keyword.toLocaleLowerCase('en-US');
					return (
						body.items.length > 0 &&
						body.items.every(
							(course) => course.title.toLocaleLowerCase('en-US').includes(needle) || course.summary.toLocaleLowerCase('en-US').includes(needle) || course.tags.some((tag) => tag.toLocaleLowerCase('en-US').includes(needle)),
						)
					);
				}),
			),
			equals(true),
		),
	),
);

Then('every returned course has modality {string}', (modality: string) => actor().attemptsTo(Ensure.that(resolved(everyCourse((course) => course.modality === modality)), equals(true))));

Then('every returned course has status {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(everyCourse((course) => course.status === status)), equals(true))));

Then('every returned course has tag {string}', (tag: string) =>
	actor().attemptsTo(Ensure.that(resolved(everyCourse((course) => course.tags.some((item) => item.toLocaleLowerCase('en-US') === tag.toLocaleLowerCase('en-US')))), equals(true))),
);

Then('the course catalog error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(errorField('code')), equals(code))));

Then('the course catalog error message is {string}', (message: string) => actor().attemptsTo(Ensure.that(resolved(errorField('message')), equals(message))));

Then('the course catalog error details include {string} saying {string}', (field: string, message: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`the ${field} error detail`, async (currentActor) => {
					const body = await currentActor.answer(errorBody());
					return body.error.details.some((detail) => detail.field === field && detail.message === message);
				}),
			),
			equals(true),
		),
	),
);

function everyCourse(predicate: (course: CourseItem) => boolean) {
	return Question.about('every returned course', async (currentActor) => {
		const body = await currentActor.answer(coursePage());
		return body.items.length > 0 && body.items.every(predicate);
	});
}
