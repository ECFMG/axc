import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CourseResource {
	id: string;
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

interface CourseSearchResponse {
	items: CourseResource[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface ErrorResponse {
	error: {
		code: string;
		message: string;
		details: { field: string; message: string }[];
	};
}

const actor = () => actorCalled('API client');

const courseSearchBody = (currentActor: { answer: <T>(answerable: Answerable<T>) => Promise<T> }) => currentActor.answer(resolved(LastResponse.body<CourseSearchResponse>()));

const pagination = () =>
	Question.about('the course search pagination', async (currentActor) => {
		const { page, pageSize, totalItems, totalPages } = await courseSearchBody(currentActor);
		return { page, pageSize, totalItems, totalPages };
	});

const returnedCourseCount = () =>
	Question.about('the number of returned courses', async (currentActor) => {
		const { items } = await courseSearchBody(currentActor);
		return items.length;
	});

const firstReturnedTitle = () =>
	Question.about('the first returned course title', async (currentActor) => {
		const { items } = await courseSearchBody(currentActor);
		return items[0]?.title ?? '';
	});

/** Ids of courses that do not satisfy the expectation. Empty means every course satisfies it. */
const courseIdsFailing = (description: string, isSatisfied: (course: CourseResource) => boolean) =>
	Question.about(description, async (currentActor) => {
		const { items } = await courseSearchBody(currentActor);
		return items.filter((course) => !isSatisfied(course)).map((course) => course.id);
	});

const sortedAscendingBy = (field: keyof CourseResource) =>
	Question.about(`whether the returned courses are sorted ascending by ${field}`, async (currentActor) => {
		const { items } = await courseSearchBody(currentActor);
		const values = items.map((course) => String(course[field]).toLowerCase());
		return values.every((value, index) => index === 0 || (values[index - 1] ?? '') <= value);
	});

const errorCode = () =>
	Question.about('the error code', async (currentActor) => {
		const body = await currentActor.answer(resolved(LastResponse.body<ErrorResponse>()));
		return body.error.code;
	});

const errorFields = () =>
	Question.about('the rejected query parameters', async (currentActor) => {
		const body = await currentActor.answer(resolved(LastResponse.body<ErrorResponse>()));
		return body.error.details.map((detail) => detail.field);
	});

const matchesKeyword = (course: CourseResource, keyword: string): boolean => {
	const needle = keyword.toLowerCase();
	return course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle) || course.tags.some((tag) => tag.toLowerCase().includes(needle));
};

When('the client searches the course catalog with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(query === '' ? '/api/courses' : `/api/courses?${query}`))));

Then('the course search responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course search reports page {int} of size {int} with {int} courses across {int} pages', (page: number, pageSize: number, totalItems: number, totalPages: number) =>
	actor().attemptsTo(Ensure.that(resolved(pagination()), equals({ page, pageSize, totalItems, totalPages }))),
);

Then('the course search returns {int} courses', (count: number) => actor().attemptsTo(Ensure.that(resolved(returnedCourseCount()), equals(count))));

Then('the first returned course is titled {string}', (title: string) => actor().attemptsTo(Ensure.that(resolved(firstReturnedTitle()), equals(title))));

Then('every returned course matches the keyword {string}', (keyword: string) =>
	actor().attemptsTo(Ensure.that(resolved(courseIdsFailing(`courses that do not match "${keyword}"`, (course) => matchesKeyword(course, keyword))), equals([]))),
);

Then('every returned course has modality {string}', (modality: string) => actor().attemptsTo(Ensure.that(resolved(courseIdsFailing(`courses that are not ${modality}`, (course) => course.modality === modality)), equals([]))));

Then('every returned course has status {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(courseIdsFailing(`courses that are not ${status}`, (course) => course.status === status)), equals([]))));

Then('every returned course has the tag {string}', (tag: string) =>
	actor().attemptsTo(Ensure.that(resolved(courseIdsFailing(`courses without the tag ${tag}`, (course) => course.tags.some((candidate) => candidate.toLowerCase() === tag.toLowerCase()))), equals([]))),
);

Then('every returned course matches the agentCourses course contract', () => actor().attemptsTo(Ensure.that(resolved(courseIdsFailing('courses that do not match the contract', isCourseResource)), equals([]))));

Then('the returned courses are sorted ascending by {string}', (field: string) => actor().attemptsTo(Ensure.that(resolved(sortedAscendingBy(field as keyof CourseResource)), equals(true))));

Then('the course search reports {string} for field {string}', (code: string, field: string) => actor().attemptsTo(Ensure.that(resolved(errorCode()), equals(code)), Ensure.that(resolved(errorFields()), equals([field]))));

function isCourseResource(course: CourseResource): boolean {
	return (
		typeof course.id === 'string' &&
		course.id.length > 0 &&
		typeof course.title === 'string' &&
		course.title.length > 0 &&
		typeof course.summary === 'string' &&
		course.summary.length > 0 &&
		['online', 'in-person', 'hybrid'].includes(course.modality) &&
		['draft', 'active', 'retired'].includes(course.status) &&
		Array.isArray(course.tags) &&
		/^\d{4}-\d{2}-\d{2}T/.test(course.createdAt) &&
		/^\d{4}-\d{2}-\d{2}T/.test(course.updatedAt)
	);
}
