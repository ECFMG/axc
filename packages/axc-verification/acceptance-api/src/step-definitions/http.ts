import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

export const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

export const actor = () => actorCalled('API client');

export interface ErrorBody {
	error: {
		code: string;
		message: string;
		details: { field: string; message: string }[];
	};
}

export interface CoursePage {
	items: {
		id: string;
		title: string;
		summary: string;
		modality: string;
		status: string;
		tags: string[];
		createdAt: string;
		updatedAt: string;
	}[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface EnrollmentBody {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: string;
	createdAt: string;
	updatedAt: string;
	statusHistory: {
		fromStatus: string | null;
		toStatus: string;
		changedAt: string;
		changedBy: string;
		reason: string | null;
	}[];
}

export interface EnrollmentList {
	items: EnrollmentBody[];
}

export const errorCode = () =>
	Question.about('the error code', async (current) => {
		const body = await current.answer(LastResponse.body<ErrorBody>());
		return body.error.code;
	});

export const errorFields = () =>
	Question.about('the error fields', async (current) => {
		const body = await current.answer(LastResponse.body<ErrorBody>());
		return body.error.details.map((detail) => detail.field);
	});

export const coursePage = () =>
	Question.about('the course page', async (current) => {
		return await current.answer(LastResponse.body<CoursePage>());
	});

export const enrollmentBody = () =>
	Question.about('the enrollment request', async (current) => {
		return await current.answer(LastResponse.body<EnrollmentBody>());
	});

export const enrollmentList = () =>
	Question.about('the enrollment list', async (current) => {
		return await current.answer(LastResponse.body<EnrollmentList>());
	});
