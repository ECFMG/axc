import { type DataTable, Then, When } from '@cucumber/cucumber';
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

interface CoursePageBody {
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

type SortField = 'title' | 'createdAt' | 'updatedAt';

const actor = () => actorCalled('API client');

const coursePage = () =>
	Question.about('the course page', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<CoursePageBody>());
	});

const coursePageMetadata = () =>
	Question.about('the course page metadata', async (currentActor) => {
		const body = await currentActor.answer(coursePage());
		return { page: body.page, pageSize: body.pageSize, totalItems: body.totalItems, totalPages: body.totalPages };
	});

const courseItems = () =>
	Question.about('the course items', async (currentActor) => {
		const body = await currentActor.answer(coursePage());
		return body.items;
	});

const courseIds = () =>
	Question.about('the course ids', async (currentActor) => {
		const items = await currentActor.answer(courseItems());
		return items.map((item) => item.id);
	});

const compareBy = (field: SortField) => (a: CourseItem, b: CourseItem) => {
	const primary = field === 'title' ? a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) : Date.parse(a[field]) - Date.parse(b[field]);
	return primary !== 0 ? primary : a.id.localeCompare(b.id);
};

const courseIdsSortedBy = (field: SortField) =>
	Question.about(`the course ids sorted by ${field}`, async (currentActor) => {
		const items = await currentActor.answer(courseItems());
		return [...items].sort(compareBy(field)).map((item) => item.id);
	});

const courseErrorBody = () =>
	Question.about('the course catalog error body', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<CourseErrorBody>());
	});

const coursesNotMatching = (description: string, predicate: (item: CourseItem) => boolean) =>
	Question.about(`the courses whose ${description}`, async (currentActor) => {
		const items = await currentActor.answer(courseItems());
		return items.filter((item) => !predicate(item)).map((item) => item.id);
	});

When('the client requests the course catalog', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses'))));

When('the client requests the course catalog with query {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course page metadata is page {int}, pageSize {int}, totalItems {int}, totalPages {int}', (page: number, pageSize: number, totalItems: number, totalPages: number) =>
	actor().attemptsTo(Ensure.that(resolved(coursePageMetadata()), equals({ page, pageSize, totalItems, totalPages }))),
);

Then('the course page contains {int} items', (count: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the number of course items', async (currentActor) => {
					const items = await currentActor.answer(courseItems());
					return items.length;
				}),
			),
			equals(count),
		),
	),
);

Then('the course items are sorted by {string}', async (field: string) => {
	if (field !== 'title' && field !== 'createdAt' && field !== 'updatedAt') {
		throw new Error(`Unsupported sort field in step: ${field}`);
	}
	const ids = await actor().answer(resolved(courseIds()));
	return actor().attemptsTo(Ensure.that(resolved(courseIdsSortedBy(field)), equals(ids)));
});

Then('the course ids in order are:', (table: DataTable) => {
	const expected = table.raw().map((row) => row[0]);
	return actor().attemptsTo(Ensure.that(resolved(courseIds()), equals(expected)));
});

Then('the first course id is {string}', (id: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the first course id', async (currentActor) => {
					const ids = await currentActor.answer(courseIds());
					return ids[0];
				}),
			),
			equals(id),
		),
	),
);

Then('every course has modality {string}', (modality: string) => actor().attemptsTo(Ensure.that(resolved(coursesNotMatching(`modality is not ${modality}`, (item) => item.modality === modality)), equals([] as string[]))));

Then('every course has status {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(coursesNotMatching(`status is not ${status}`, (item) => item.status === status)), equals([] as string[]))));

Then('every course has the tag {string} ignoring case', (tag: string) =>
	actor().attemptsTo(Ensure.that(resolved(coursesNotMatching(`tags lack ${tag}`, (item) => item.tags.some((candidate) => candidate.toLowerCase() === tag.toLowerCase()))), equals([] as string[]))),
);

Then('the course catalog error reports field {string} with message {string}', (field: string, message: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(courseErrorBody()),
			equals({
				error: {
					code: 'INVALID_QUERY_PARAMETER',
					message: 'One or more query parameters are invalid.',
					details: [{ field, message }],
				},
			}),
		),
	),
);
