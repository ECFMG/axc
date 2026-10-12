import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { GetRequest, Send } from '@serenity-js/rest';
import { apiClient, bodyQuestion } from '../api-questions.ts';

interface CourseSearchBody {
	items?: { id: string }[];
	page?: number;
	pageSize?: number;
	totalItems?: number;
	totalPages?: number;
}

const pageSize = () => bodyQuestion<CourseSearchBody, number>('the response page size', (body) => body.pageSize ?? -1);

const totalItems = () => bodyQuestion<CourseSearchBody, number>('the response total item count', (body) => body.totalItems ?? -1);

const containsCourse = (courseId: string) => bodyQuestion<CourseSearchBody, boolean>(`whether the response contains ${courseId}`, (body) => (body.items ?? []).some((course) => course.id === courseId));

const containsAtMost = (maximum: number) => bodyQuestion<CourseSearchBody, boolean>(`whether the response contains at most ${maximum} courses`, (body) => (body.items ?? []).length <= maximum);

When('the client searches the course catalog with {string}', (query: string) => apiClient().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the catalog response contains course {string}', (courseId: string) => apiClient().attemptsTo(Ensure.that(containsCourse(courseId), isTrue())));

Then('the catalog response reports a page size of {int}', (expected: number) => apiClient().attemptsTo(Ensure.that(pageSize(), equals(expected))));

Then('the catalog response reports {int} total items', (expected: number) => apiClient().attemptsTo(Ensure.that(totalItems(), equals(expected))));

Then('the catalog response contains at most {int} courses', (maximum: number) => apiClient().attemptsTo(Ensure.that(containsAtMost(maximum), isTrue())));
