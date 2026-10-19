import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, PostRequest, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

const actor = () => actorCalled('API client');
const justification = 'I need this course to prepare for upcoming secure development work.';

interface CourseItem {
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

interface HistoryEntry {
	fromStatus: string | null;
	toStatus: string;
	changedBy: string;
	reason: string | null;
}

interface EnrollmentBody {
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: string;
	statusHistory: HistoryEntry[];
}

When('the client creates an enrollment request for course {string}', (courseId: string) =>
	actor().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with({ courseId, learnerEmail: 'learner@example.org', justification }))),
);

When('the client searches courses for {string} with modality {string} and status {string}', (q: string, modality: string, status: string) =>
	actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?q=${encodeURIComponent(q)}&modality=${encodeURIComponent(modality)}&status=${encodeURIComponent(status)}`))),
);

When('the client searches courses with page size {string}', (pageSize: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?pageSize=${encodeURIComponent(pageSize)}`))));

Then('the response status is {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(Number(status)))));

Then('the enrollment request is pending for course {string}', (courseId: string) => actor().attemptsTo(Ensure.that(resolved(enrollmentVerdict(courseId)), equals('match'))));

Then('the course search returns only online active security courses including {string}', (title: string) => actor().attemptsTo(Ensure.that(resolved(courseSearchVerdict(title)), equals('match'))));

Then('the course search error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(errorCode()), equals(code))));

function enrollmentVerdict(courseId: string) {
	return Question.about('the created enrollment request', async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<EnrollmentBody>());
		const entry = body.statusHistory[0];
		const matches =
			body.status === 'pending' &&
			body.courseId === courseId &&
			body.learnerEmail === 'learner@example.org' &&
			body.justification === justification &&
			body.statusHistory.length === 1 &&
			entry?.fromStatus === null &&
			entry.toStatus === 'pending' &&
			entry.changedBy === 'system' &&
			entry.reason === null;
		return matches ? 'match' : 'miss';
	});
}

function courseSearchVerdict(title: string) {
	return Question.about('the filtered courses', async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CoursePage>());
		const filtersHold = body.items.every((item) => item.modality === 'online' && item.status === 'active' && `${item.title} ${item.summary} ${item.tags.join(' ')}`.toLowerCase().includes('security'));
		const includesKnown = body.items.some((item) => item.title === title);
		const pageHolds = body.page === 1 && body.pageSize === 10 && body.totalItems === body.items.length && body.totalPages >= 1;
		return filtersHold && includesKnown && pageHolds ? 'match' : 'miss';
	});
}

function errorCode() {
	return Question.about('the error code', async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<{ error: { code: string } }>());
		return body.error.code;
	});
}
