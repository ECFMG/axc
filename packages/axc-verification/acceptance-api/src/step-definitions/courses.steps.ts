import { type DataTable, Then, When } from '@cucumber/cucumber';
import { Ensure, equals, isGreaterThan, isLessThan, isTrue } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

const asked = <T>(description: string, question: (currentActor: { answer<A>(value: Answerable<A>): Promise<A> }) => Promise<T>): Answerable<T> => resolved(Question.about(description, question));

interface CatalogCourse {
	id: string;
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

interface CourseCatalogPage {
	items: CatalogCourse[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface QueryParameterErrorDetail {
	field: string;
	message: string;
}

interface CourseCatalogErrorBody {
	error: {
		code: string;
		message: string;
		details: QueryParameterErrorDetail[];
	};
}

const actor = () => actorCalled('API client');

const catalogPage = () =>
	Question.about('the course catalog page', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<CourseCatalogPage>());
	});

const catalogItems = () =>
	Question.about('the course catalog items', async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseCatalogPage>());
		return body.items;
	});

const catalogError = () =>
	Question.about('the course catalog error', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<CourseCatalogErrorBody>());
	});

function catalogPath(params?: Record<string, string>): string {
	if (!params || Object.keys(params).length === 0) {
		return '/api/courses';
	}
	const search = new URLSearchParams(params);
	return `/api/courses?${search.toString()}`;
}

function includesKeyword(course: CatalogCourse, keyword: string): boolean {
	const needle = keyword.toLowerCase();
	return course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle) || course.tags.some((tag) => tag.toLowerCase().includes(needle));
}

When('the client requests the course catalog', () => actor().attemptsTo(Send.a(GetRequest.to(catalogPath()))));

When('the client requests the course catalog with:', (table: DataTable) => {
	const params = Object.fromEntries(table.raw().map(([field, value]) => [field ?? '', value ?? '']));
	return actor().attemptsTo(Send.a(GetRequest.to(catalogPath(params))));
});

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course catalog uses default pagination', () =>
	actor().attemptsTo(
		Ensure.that(
			asked('default page', async (currentActor) => (await currentActor.answer(catalogPage())).page),
			equals(1),
		),
		Ensure.that(
			asked('default page size', async (currentActor) => (await currentActor.answer(catalogPage())).pageSize),
			equals(10),
		),
		Ensure.that(
			asked('item count', async (currentActor) => (await currentActor.answer(catalogItems())).length),
			isLessThan(11),
		),
		Ensure.that(
			asked('seeded catalog size', async (currentActor) => (await currentActor.answer(catalogPage())).totalItems),
			isGreaterThan(11),
		),
	),
);

Then('every catalog course has the required fields', () =>
	actor().attemptsTo(
		Ensure.that(
			asked('every course has required fields', async (currentActor) => {
				const items = await currentActor.answer(catalogItems());
				return (
					items.length > 0 &&
					items.every(
						(course) =>
							typeof course.id === 'string' &&
							course.id.length > 0 &&
							typeof course.title === 'string' &&
							typeof course.summary === 'string' &&
							['online', 'in-person', 'hybrid'].includes(course.modality) &&
							['draft', 'active', 'retired'].includes(course.status) &&
							Array.isArray(course.tags) &&
							typeof course.createdAt === 'string' &&
							course.createdAt.includes('T') &&
							typeof course.updatedAt === 'string' &&
							course.updatedAt.includes('T'),
					)
				);
			}),
			isTrue(),
		),
	),
);

Then('every returned course matches keyword {string} in title, summary, or tags', (keyword: string) =>
	actor().attemptsTo(
		Ensure.that(
			asked(`every course matches ${keyword}`, async (currentActor) => {
				const items = await currentActor.answer(catalogItems());
				return items.length > 0 && items.every((course) => includesKeyword(course, keyword));
			}),
			isTrue(),
		),
	),
);

Then('the catalog includes a title match, a summary match, and a tag match for {string}', (keyword: string) =>
	actor().attemptsTo(
		Ensure.that(
			asked(`catalog covers title, summary, and tag matches for ${keyword}`, async (currentActor) => {
				const items = await currentActor.answer(catalogItems());
				const needle = keyword.toLowerCase();
				const titleMatch = items.some((course) => course.title.toLowerCase().includes(needle));
				const summaryOnly = items.some((course) => !course.title.toLowerCase().includes(needle) && course.summary.toLowerCase().includes(needle));
				const tagOnly = items.some((course) => !course.title.toLowerCase().includes(needle) && !course.summary.toLowerCase().includes(needle) && course.tags.some((tag) => tag.toLowerCase().includes(needle)));
				return titleMatch && summaryOnly && tagOnly;
			}),
			isTrue(),
		),
	),
);

Then('every returned course has modality {string}', (modality: string) =>
	actor().attemptsTo(
		Ensure.that(
			asked(`every course has modality ${modality}`, async (currentActor) => {
				const items = await currentActor.answer(catalogItems());
				return items.length > 0 && items.every((course) => course.modality === modality);
			}),
			isTrue(),
		),
	),
);

Then('every returned course has status {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(
			asked(`every course has status ${status}`, async (currentActor) => {
				const items = await currentActor.answer(catalogItems());
				return items.length > 0 && items.every((course) => course.status === status);
			}),
			isTrue(),
		),
	),
);

Then('every returned course contains tag {string}', (tag: string) =>
	actor().attemptsTo(
		Ensure.that(
			asked(`every course contains tag ${tag}`, async (currentActor) => {
				const items = await currentActor.answer(catalogItems());
				const needle = tag.toLowerCase();
				return items.length > 0 && items.every((course) => course.tags.some((value) => value.toLowerCase() === needle));
			}),
			isTrue(),
		),
	),
);

Then('the course catalog page has at most {int} items', (pageSize: number) =>
	actor().attemptsTo(
		Ensure.that(
			asked('page item count', async (currentActor) => (await currentActor.answer(catalogItems())).length),
			isLessThan(pageSize + 1),
		),
	),
);

Then('the course catalog pagination metadata matches page {int} and page size {int}', (page: number, pageSize: number) =>
	actor().attemptsTo(
		Ensure.that(
			asked('page number', async (currentActor) => (await currentActor.answer(catalogPage())).page),
			equals(page),
		),
		Ensure.that(
			asked('page size', async (currentActor) => (await currentActor.answer(catalogPage())).pageSize),
			equals(pageSize),
		),
		Ensure.that(
			asked('total pages is consistent', async (currentActor) => {
				const body = await currentActor.answer(catalogPage());
				return body.totalPages === Math.ceil(body.totalItems / body.pageSize);
			}),
			isTrue(),
		),
	),
);

Then('the returned courses are sorted by title', () =>
	actor().attemptsTo(
		Ensure.that(
			asked('courses sorted by title', async (currentActor) => {
				const titles = (await currentActor.answer(catalogItems())).map((course) => course.title);
				const sorted = [...titles].sort((left, right) => left.localeCompare(right));
				return titles.length > 1 && titles.every((title, index) => title === sorted[index]);
			}),
			isTrue(),
		),
	),
);

Then('the returned courses are sorted by createdAt', () =>
	actor().attemptsTo(
		Ensure.that(
			asked('courses sorted by createdAt', async (currentActor) => {
				const values = (await currentActor.answer(catalogItems())).map((course) => course.createdAt);
				const sorted = [...values].sort((left, right) => left.localeCompare(right));
				return values.length > 1 && values.every((value, index) => value === sorted[index]);
			}),
			isTrue(),
		),
	),
);

Then('the course catalog error is INVALID_QUERY_PARAMETER for {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			asked('error code', async (currentActor) => (await currentActor.answer(catalogError())).error.code),
			equals('INVALID_QUERY_PARAMETER'),
		),
		Ensure.that(
			asked('error message', async (currentActor) => (await currentActor.answer(catalogError())).error.message),
			equals('One or more query parameters are invalid.'),
		),
		Ensure.that(
			asked(`error details include ${field}`, async (currentActor) => {
				const details = (await currentActor.answer(catalogError())).error.details;
				return Array.isArray(details) && details.some((detail) => detail.field === field && typeof detail.message === 'string' && detail.message.length > 0);
			}),
			isTrue(),
		),
	),
);

Then('the course catalog items list is empty', () =>
	actor().attemptsTo(
		Ensure.that(
			asked('empty items', async (currentActor) => (await currentActor.answer(catalogItems())).length),
			equals(0),
		),
	),
);

Then('the course catalog pagination metadata is valid for no matches', () =>
	actor().attemptsTo(
		Ensure.that(
			asked('page for no matches', async (currentActor) => (await currentActor.answer(catalogPage())).page),
			equals(1),
		),
		Ensure.that(
			asked('page size for no matches', async (currentActor) => (await currentActor.answer(catalogPage())).pageSize),
			equals(10),
		),
		Ensure.that(
			asked('total items for no matches', async (currentActor) => (await currentActor.answer(catalogPage())).totalItems),
			equals(0),
		),
		Ensure.that(
			asked('total pages for no matches', async (currentActor) => (await currentActor.answer(catalogPage())).totalPages),
			equals(0),
		),
	),
);
