import { Then } from '@cucumber/cucumber';
import { Ensure, equals, isLessThan, isTrue } from '@serenity-js/assertions';
import { actor, lastBody } from './http.steps.ts';

interface Course {
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}
interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

const page = () => lastBody<CoursePage>();

Then('the course page has at most {int} items', async (max: number) => actor().attemptsTo(Ensure.that((await page()).items.length, isLessThan(max + 1))));

Then('the course page reports page {int}, pageSize {int} and totalItems {int}', async (p: number, size: number, total: number) => {
	const body = await page();
	await actor().attemptsTo(Ensure.that([body.page, body.pageSize, body.totalItems, body.totalPages], equals([p, size, total, Math.ceil(total / size)])));
});

Then('the course page is empty', async () => actor().attemptsTo(Ensure.that((await page()).items, equals([]))));

Then('every course has {word} {string}', async (field: 'modality' | 'status', value: string) => {
	const { items } = await page();
	await actor().attemptsTo(Ensure.that(items.length > 0 && items.every((c) => c[field] === value), isTrue()));
});

Then('every course has the tag {string} ignoring case', async (tag: string) => {
	const { items } = await page();
	await actor().attemptsTo(Ensure.that(items.length > 0 && items.every((c) => c.tags.some((t) => t.toLowerCase() === tag)), isTrue()));
});

Then('every course mentions {string} in title, summary or tags ignoring case', async (term: string) => {
	const { items } = await page();
	const mentions = (c: Course) => [c.title, c.summary, ...c.tags].some((text) => text.toLowerCase().includes(term));
	await actor().attemptsTo(Ensure.that(items.length > 0 && items.every(mentions), isTrue()));
});

Then('the courses are sorted by {word}', async (field: 'title' | 'createdAt') => {
	const values = (await page()).items.map((c) => c[field]);
	await actor().attemptsTo(Ensure.that(values, equals([...values].sort((a, b) => a.localeCompare(b)))));
});
