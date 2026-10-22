import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
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
		details: { field: string; message: string }[];
	};
}

type CourseTextField = 'id' | 'title' | 'summary' | 'modality' | 'status' | 'createdAt' | 'updatedAt';

const actor = () => actorCalled('API client');

const coursePage = () =>
	Question.about('the course catalog page', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<CoursePage>());
	});

const courseNumber = (field: 'page' | 'pageSize' | 'totalItems' | 'totalPages') =>
	Question.about(`the course catalog ${field}`, async (currentActor) => {
		const body = await currentActor.answer(coursePage());
		return body[field];
	});

const courseItemIds = () =>
	Question.about('the course item ids', async (currentActor) => {
		const body = await currentActor.answer(coursePage());
		return body.items.map((item) => item.id).join(',');
	});

const firstCourseText = (field: CourseTextField) =>
	Question.about(`the first course ${field}`, async (currentActor) => {
		const body = await currentActor.answer(coursePage());
		const course = body.items[0];
		if (course === undefined) {
			return '';
		}
		return course[field];
	});

const firstCourseTags = () =>
	Question.about('the first course tags', async (currentActor) => {
		const body = await currentActor.answer(coursePage());
		const course = body.items[0];
		if (course === undefined) {
			return '';
		}
		return course.tags.join(',');
	});

const everyCourse = (label: string, predicate: (course: CourseItem) => boolean) =>
	Question.about(label, async (currentActor) => {
		const body = await currentActor.answer(coursePage());
		return body.items.length > 0 && body.items.every(predicate);
	});

const createdAtOrder = () =>
	Question.about('the createdAt order', async (currentActor) => {
		const body = await currentActor.answer(coursePage());
		const stamps = body.items.map((item) => item.createdAt);
		return stamps.every((stamp, index) => index === 0 || stamp >= (stamps[index - 1] ?? stamp));
	});

const errorBody = () =>
	Question.about('the course error body', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<CourseErrorBody>());
	});

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

const errorDetailMessage = (field: string) =>
	Question.about(`the ${field} error detail`, async (currentActor) => {
		const body = await currentActor.answer(errorBody());
		const detail = body.error.details.find((item) => item.field === field);
		if (detail === undefined) {
			return '';
		}
		return detail.message;
	});

When('the client requests the course catalog', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses'))));

When('the client requests the course catalog with query {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course catalog page is {int}', (page: number) => actor().attemptsTo(Ensure.that(resolved(courseNumber('page')), equals(page))));

Then('the course catalog page size is {int}', (pageSize: number) => actor().attemptsTo(Ensure.that(resolved(courseNumber('pageSize')), equals(pageSize))));

Then('the course catalog total items is {int}', (totalItems: number) => actor().attemptsTo(Ensure.that(resolved(courseNumber('totalItems')), equals(totalItems))));

Then('the course catalog total pages is {int}', (totalPages: number) => actor().attemptsTo(Ensure.that(resolved(courseNumber('totalPages')), equals(totalPages))));

Then('the course catalog item ids are {string}', (expected: string) => actor().attemptsTo(Ensure.that(resolved(courseItemIds()), equals(expected))));

Then('the course catalog items are empty', () => actor().attemptsTo(Ensure.that(resolved(courseItemIds()), equals(''))));

Then('every returned course has modality {string}', (modality: string) => actor().attemptsTo(Ensure.that(resolved(everyCourse('modalities', (course) => course.modality === modality)), equals(true))));

Then('every returned course has status {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(everyCourse('statuses', (course) => course.status === status)), equals(true))));

Then('every returned course has tag {string}', (tag: string) =>
	actor().attemptsTo(Ensure.that(resolved(everyCourse('tags', (course) => course.tags.some((candidate) => candidate.toLocaleLowerCase('en-US') === tag.toLocaleLowerCase('en-US')))), equals(true))),
);

Then('every returned course matches keyword {string}', (keyword: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				everyCourse('keywords', (course) => {
					const needle = keyword.toLocaleLowerCase('en-US');
					return [course.title, course.summary, ...course.tags].some((value) => value.toLocaleLowerCase('en-US').includes(needle));
				}),
			),
			equals(true),
		),
	),
);

Then('the returned courses are sorted by createdAt', () => actor().attemptsTo(Ensure.that(resolved(createdAtOrder()), equals(true))));

Then('the course catalog error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(errorCode()), equals(code))));

Then('the course catalog error message is {string}', (message: string) => actor().attemptsTo(Ensure.that(resolved(errorMessage()), equals(message))));

Then('the course catalog error detail for {string} is {string}', (field: string, message: string) => actor().attemptsTo(Ensure.that(resolved(errorDetailMessage(field)), equals(message))));

Then(
	'the first course is {string} {string} {string} {string} {string} {string} {string} {string}',
	(id: string, title: string, summary: string, modality: string, status: string, tags: string, createdAt: string, updatedAt: string) =>
		actor().attemptsTo(
			Ensure.that(resolved(firstCourseText('id')), equals(id)),
			Ensure.that(resolved(firstCourseText('title')), equals(title)),
			Ensure.that(resolved(firstCourseText('summary')), equals(summary)),
			Ensure.that(resolved(firstCourseText('modality')), equals(modality)),
			Ensure.that(resolved(firstCourseText('status')), equals(status)),
			Ensure.that(resolved(firstCourseTags()), equals(tags)),
			Ensure.that(resolved(firstCourseText('createdAt')), equals(createdAt)),
			Ensure.that(resolved(firstCourseText('updatedAt')), equals(updatedAt)),
		),
);
