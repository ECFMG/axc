import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CourseListItem {
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
	items: CourseListItem[];
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

const courseBody = Question.about('the course catalog body', async (currentActor) => currentActor.answer(LastResponse.body<CourseListBody>()));

const courseNumber = (field: 'page' | 'pageSize' | 'totalItems' | 'totalPages') =>
	Question.about(`the course ${field}`, async (currentActor) => {
		const body = await currentActor.answer(courseBody);
		return body[field];
	});

const courseTitles = Question.about('the course titles', async (currentActor) => {
	const body = await currentActor.answer(courseBody);
	return body.items.map((item) => item.title).join(',');
});

const courseItemCount = Question.about('the course item count', async (currentActor) => {
	const body = await currentActor.answer(courseBody);
	return body.items.length;
});

const firstCourseTitles = (count: number) =>
	Question.about(`the first ${count} course titles`, async (currentActor) => {
		const body = await currentActor.answer(courseBody);
		return body.items
			.slice(0, count)
			.map((item) => item.title)
			.join(',');
	});

const firstCourse = Question.about('the first course', async (currentActor) => {
	const body = await currentActor.answer(courseBody);
	const item = body.items[0];
	if (item === undefined) {
		throw new Error('expected a course');
	}
	return item;
});

const firstCourseField = <K extends keyof CourseListItem>(field: K) =>
	Question.about(`the first course ${field}`, async (currentActor) => {
		const item = await currentActor.answer(firstCourse);
		return item[field];
	});

const firstCourseTags = Question.about('the first course tags', async (currentActor) => {
	const item = await currentActor.answer(firstCourse);
	return item.tags.join(',');
});

const errorBody = Question.about('the course error body', async (currentActor) => currentActor.answer(LastResponse.body<CourseErrorBody>()));

const errorDetailCount = Question.about('the course error detail count', async (currentActor) => {
	const body = await currentActor.answer(errorBody);
	return body.error.details.length;
});

const errorDetailField = Question.about('the course error field', async (currentActor) => {
	const body = await currentActor.answer(errorBody);
	return body.error.details[0]?.field ?? '';
});

const errorDetailMessage = Question.about('the course error detail message', async (currentActor) => {
	const body = await currentActor.answer(errorBody);
	return body.error.details[0]?.message ?? '';
});

const errorCode = Question.about('the course error code', async (currentActor) => {
	const body = await currentActor.answer(errorBody);
	return body.error.code;
});

const errorMessage = Question.about('the course error message', async (currentActor) => {
	const body = await currentActor.answer(errorBody);
	return body.error.message;
});

When('the client requests the course catalog', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses'))));

When('the client requests the course catalog with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course page is {int}', (page: number) => actor().attemptsTo(Ensure.that(resolved(courseNumber('page')), equals(page))));

Then('the course page size is {int}', (pageSize: number) => actor().attemptsTo(Ensure.that(resolved(courseNumber('pageSize')), equals(pageSize))));

Then('the course total items is {int}', (totalItems: number) => actor().attemptsTo(Ensure.that(resolved(courseNumber('totalItems')), equals(totalItems))));

Then('the course total pages is {int}', (totalPages: number) => actor().attemptsTo(Ensure.that(resolved(courseNumber('totalPages')), equals(totalPages))));

Then('the course items count is {int}', (count: number) => actor().attemptsTo(Ensure.that(resolved(courseItemCount), equals(count))));

Then('the course titles are {string}', (titles: string) => actor().attemptsTo(Ensure.that(resolved(courseTitles), equals(titles))));

Then('the first course titles are {string}', (titles: string) => actor().attemptsTo(Ensure.that(resolved(firstCourseTitles(titles.split(',').length)), equals(titles))));

Then('the first course is AI Security Foundations', () =>
	actor().attemptsTo(
		Ensure.that(resolved(firstCourseField('id')), equals('course-001')),
		Ensure.that(resolved(firstCourseField('title')), equals('AI Security Foundations')),
		Ensure.that(resolved(firstCourseField('summary')), equals('Introductory course on secure AI-assisted development.')),
		Ensure.that(resolved(firstCourseField('modality')), equals('online')),
		Ensure.that(resolved(firstCourseField('status')), equals('active')),
		Ensure.that(resolved(firstCourseTags), equals('ai,security')),
		Ensure.that(resolved(firstCourseField('createdAt')), equals('2026-01-15T00:00:00.000Z')),
		Ensure.that(resolved(firstCourseField('updatedAt')), equals('2026-06-01T00:00:00.000Z')),
	),
);

Then('the only course error detail is field {string} and message {string}', (field: string, message: string) =>
	actor().attemptsTo(
		Ensure.that(resolved(errorCode), equals('INVALID_QUERY_PARAMETER')),
		Ensure.that(resolved(errorMessage), equals('One or more query parameters are invalid.')),
		Ensure.that(resolved(errorDetailCount), equals(1)),
		Ensure.that(resolved(errorDetailField), equals(field)),
		Ensure.that(resolved(errorDetailMessage), equals(message)),
	),
);
