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

const actor = () => actorCalled('API client');

const page = () =>
	Question.about('the courses page', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<CoursePage>());
	});

const errorBody = () =>
	Question.about('the courses error', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<CourseErrorBody>());
	});

When('the client requests courses with query {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses${query}`))));

Then('the courses response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the courses page is {int} and the page size is {int}', (pageNumber: number, pageSize: number) =>
	actor().attemptsTo(
		Ensure.that(resolved(Question.about('page', async (currentActor) => (await currentActor.answer(page())).page)), equals(pageNumber)),
		Ensure.that(resolved(Question.about('page size', async (currentActor) => (await currentActor.answer(page())).pageSize)), equals(pageSize)),
	),
);

Then('the courses total is {int} items and {int} pages', (totalItems: number, totalPages: number) =>
	actor().attemptsTo(
		Ensure.that(resolved(Question.about('total items', async (currentActor) => (await currentActor.answer(page())).totalItems)), equals(totalItems)),
		Ensure.that(resolved(Question.about('total pages', async (currentActor) => (await currentActor.answer(page())).totalPages)), equals(totalPages)),
	),
);

Then('the courses item count is {int}', (count: number) => actor().attemptsTo(Ensure.that(resolved(Question.about('item count', async (currentActor) => (await currentActor.answer(page())).items.length)), equals(count))));

Then('the first course title is {string}', (title: string) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('first title', async (currentActor) => (await currentActor.answer(page())).items[0]?.title ?? '')), equals(title))),
);

Then('the courses include title {string}', (title: string) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about(`title ${title}`, async (currentActor) => (await currentActor.answer(page())).items.some((item) => item.title === title))), equals(true))),
);

Then('every course modality is {string}', (modality: string) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('modalities', async (currentActor) => (await currentActor.answer(page())).items.every((item) => item.modality === modality))), equals(true))),
);

Then('every course status is {string}', (status: string) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('statuses', async (currentActor) => (await currentActor.answer(page())).items.every((item) => item.status === status))), equals(true))),
);

Then('every course has tag {string}', (tag: string) =>
	actor().attemptsTo(
		Ensure.that(resolved(Question.about('tags', async (currentActor) => (await currentActor.answer(page())).items.every((item) => item.tags.some((itemTag) => itemTag.toLowerCase() === tag.toLowerCase())))), equals(true)),
	),
);

Then('every course matches keyword {string}', (keyword: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('keyword matches', async (currentActor) => {
					const needle = keyword.toLowerCase();
					return (await currentActor.answer(page())).items.every(
						(item) => item.title.toLowerCase().includes(needle) || item.summary.toLowerCase().includes(needle) || item.tags.some((itemTag) => itemTag.toLowerCase().includes(needle)),
					);
				}),
			),
			equals(true),
		),
	),
);

Then('the courses are sorted by title', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('title order', async (currentActor) => {
					const titles = (await currentActor.answer(page())).items.map((item) => item.title);
					return titles.every((title, index) => index === 0 || title.localeCompare(titles[index - 1] ?? title) >= 0);
				}),
			),
			equals(true),
		),
	),
);

Then('the courses are sorted by createdAt', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('createdAt order', async (currentActor) => {
					const stamps = (await currentActor.answer(page())).items.map((item) => item.createdAt);
					return stamps.every((stamp, index) => index === 0 || stamp.localeCompare(stamps[index - 1] ?? stamp) >= 0);
				}),
			),
			equals(true),
		),
	),
);

Then('the courses error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(Question.about('error code', async (currentActor) => (await currentActor.answer(errorBody())).error.code)), equals(code))));

Then('the courses error details include field {string}', (field: string) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about(`error field ${field}`, async (currentActor) => (await currentActor.answer(errorBody())).error.details.some((detail) => detail.field === field))), equals(true))),
);

Then('the courses error message for {string} is {string}', (field: string, message: string) =>
	actor().attemptsTo(
		Ensure.that(resolved(Question.about(`error message ${field}`, async (currentActor) => (await currentActor.answer(errorBody())).error.details.find((detail) => detail.field === field)?.message ?? '')), equals(message)),
	),
);
