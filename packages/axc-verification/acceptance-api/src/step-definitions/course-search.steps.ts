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

interface CourseError {
	error: {
		code: string;
		message: string;
		details: { field: string; message: string }[];
	};
}

const actor = () => actorCalled('API client');

const coursePage = () =>
	Question.about('the course page', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<CoursePage>());
	});

const courseError = () =>
	Question.about('the course error', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<CourseError>());
	});

When('the client requests GET {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the course response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course page is {int}', (page: number) => actor().attemptsTo(Ensure.that(resolved(Question.about('page', async (currentActor) => (await currentActor.answer(coursePage())).page)), equals(page))));

Then('the course page size is {int}', (pageSize: number) => actor().attemptsTo(Ensure.that(resolved(Question.about('pageSize', async (currentActor) => (await currentActor.answer(coursePage())).pageSize)), equals(pageSize))));

Then('the course item count is {int}', (count: number) => actor().attemptsTo(Ensure.that(resolved(Question.about('item count', async (currentActor) => (await currentActor.answer(coursePage())).items.length)), equals(count))));

Then('the course total items is {int}', (total: number) => actor().attemptsTo(Ensure.that(resolved(Question.about('total items', async (currentActor) => (await currentActor.answer(coursePage())).totalItems)), equals(total))));

Then('the course total pages is {int}', (totalPages: number) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('total pages', async (currentActor) => (await currentActor.answer(coursePage())).totalPages)), equals(totalPages))),
);

Then('the first course title is {string}', (title: string) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('first title', async (currentActor) => (await currentActor.answer(coursePage())).items[0]?.title)), equals(title))),
);

Then('the course titles include {string}', (title: string) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('titles include', async (currentActor) => (await currentActor.answer(coursePage())).items.some((item) => item.title === title))), equals(true))),
);

Then('every course modality is {string}', (modality: string) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('modalities', async (currentActor) => (await currentActor.answer(coursePage())).items.every((item) => item.modality === modality))), equals(true))),
);

Then('every course status is {string}', (status: string) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('statuses', async (currentActor) => (await currentActor.answer(coursePage())).items.every((item) => item.status === status))), equals(true))),
);

Then('every course has tag {string}', (tag: string) =>
	actor().attemptsTo(
		Ensure.that(resolved(Question.about('tags', async (currentActor) => (await currentActor.answer(coursePage())).items.every((item) => item.tags.some((value) => value.toLowerCase() === tag.toLowerCase())))), equals(true)),
	),
);

Then('the course error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(Question.about('error code', async (currentActor) => (await currentActor.answer(courseError())).error.code)), equals(code))));

Then('the course error field is {string}', (field: string) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('error field', async (currentActor) => (await currentActor.answer(courseError())).error.details.some((detail) => detail.field === field))), equals(true))),
);
