import { describe, expect, it } from 'vitest';
import { courseSeed } from './course-seed.ts';

const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const isIsoDateString = (value: string): boolean => ISO_UTC_PATTERN.test(value) && new Date(value).toISOString() === value;

describe('courseSeed', () => {
	it('contains at least 12 courses', () => {
		expect(courseSeed.length).toBeGreaterThanOrEqual(12);
	});

	it('uses a unique id for every course', () => {
		const ids = courseSeed.map((course) => course.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('includes every modality', () => {
		const modalities = new Set(courseSeed.map((course) => course.modality));
		expect([...modalities].sort()).toEqual(['hybrid', 'in-person', 'online']);
	});

	it('includes every status', () => {
		const statuses = new Set(courseSeed.map((course) => course.status));
		expect([...statuses].sort()).toEqual(['active', 'draft', 'retired']);
	});

	it('gives every course a non-empty array of non-empty string tags', () => {
		for (const course of courseSeed) {
			expect(Array.isArray(course.tags), course.id).toBe(true);
			expect(course.tags.length, course.id).toBeGreaterThan(0);
			for (const tag of course.tags) {
				expect(typeof tag, course.id).toBe('string');
				expect(tag.trim().length, course.id).toBeGreaterThan(0);
			}
		}
	});

	it('gives every course non-empty id, title, and summary strings', () => {
		for (const course of courseSeed) {
			expect(course.id.trim().length, course.id).toBeGreaterThan(0);
			expect(course.title.trim().length, course.id).toBeGreaterThan(0);
			expect(course.summary.trim().length, course.id).toBeGreaterThan(0);
		}
	});

	it('uses valid ISO date strings for createdAt and updatedAt', () => {
		for (const course of courseSeed) {
			expect(isIsoDateString(course.createdAt), `${course.id} createdAt ${course.createdAt}`).toBe(true);
			expect(isIsoDateString(course.updatedAt), `${course.id} updatedAt ${course.updatedAt}`).toBe(true);
		}
	});

	it('never has createdAt later than updatedAt', () => {
		for (const course of courseSeed) {
			expect(Date.parse(course.createdAt), course.id).toBeLessThanOrEqual(Date.parse(course.updatedAt));
		}
	});

	it('includes the API contract example course course-001', () => {
		expect(courseSeed.find((course) => course.id === 'course-001')).toEqual({
			id: 'course-001',
			title: 'AI Security Foundations',
			summary: expect.any(String),
			modality: 'online',
			status: 'active',
			tags: ['ai', 'security'],
			createdAt: '2026-01-15T00:00:00.000Z',
			updatedAt: '2026-06-01T00:00:00.000Z',
		});
	});
});
