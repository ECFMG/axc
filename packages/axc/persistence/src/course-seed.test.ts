import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { seedCourses } from './course-seed.ts';
import { createSeedCourseCatalog } from './in-memory-course-catalog.ts';

const isoDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('course seed', () => {
	it('includes at least 12 courses with mixed modality, status, and tags', () => {
		assert.ok(seedCourses.length >= 12);
		assert.deepEqual(unique(seedCourses.map((course) => course.modality)).sort(), ['hybrid', 'in-person', 'online']);
		assert.deepEqual(unique(seedCourses.map((course) => course.status)).sort(), ['active', 'draft', 'retired']);
		assert.ok(unique(seedCourses.flatMap((course) => course.tags.map((tag) => tag.toLocaleLowerCase('en')))).length >= 3);
		assert.equal(new Set(seedCourses.map((course) => course.id)).size, seedCourses.length);
	});

	it('keeps the documented AI Security Foundations record', () => {
		const course = seedCourses.find((item) => item.id === 'course-001');
		assert.ok(course);
		assert.deepEqual(course, {
			id: 'course-001',
			title: 'AI Security Foundations',
			summary: 'Introductory course on secure AI-assisted development.',
			modality: 'online',
			status: 'active',
			tags: ['ai', 'security'],
			createdAt: '2026-01-15T00:00:00.000Z',
			updatedAt: '2026-06-01T00:00:00.000Z',
		});
	});

	it('matches the documented search counts', () => {
		assert.equal(seedCourses.length, 15);
		assert.equal(seedCourses.filter((course) => course.modality === 'online').length, 6);
		assert.equal(seedCourses.filter((course) => course.status === 'active').length, 8);
		assert.equal(seedCourses.filter((course) => course.tags.some((tag) => tag.toLocaleLowerCase('en') === 'ai')).length, 3);
		assert.deepEqual(
			matchingSecurity()
				.map((course) => course.id)
				.sort(),
			['course-001', 'course-003', 'course-009', 'course-014', 'course-015'],
		);
		assert.deepEqual(
			matchingSecurity()
				.filter((course) => course.modality === 'online' && course.status === 'active')
				.map((course) => course.id),
			['course-001'],
		);
		assert.equal(sortedBy(seedCourses, 'title')[0]?.id, 'course-001');
		assert.equal(sortedBy(seedCourses, 'createdAt')[0]?.id, 'course-004');
	});

	it('stores complete ISO dates and searchable tags', () => {
		for (const course of seedCourses) {
			assert.match(course.id, /^course-\d{3}$/);
			assert.ok(course.title.trim().length > 0);
			assert.ok(course.summary.trim().length > 0);
			assert.ok(course.tags.length > 0);
			assert.match(course.createdAt, isoDate);
			assert.match(course.updatedAt, isoDate);
		}
	});

	it('returns copies so callers cannot change the seed', async () => {
		const catalog = createSeedCourseCatalog();
		const first = await catalog.listAll();
		const sample = first[0];
		assert.ok(sample);
		(sample.tags as string[]).push('mutated');
		const second = await catalog.listAll();
		const again = second[0];
		assert.ok(again);
		assert.equal(again.tags.includes('mutated'), false);
	});
});

function unique(values: readonly string[]): string[] {
	return [...new Set(values)];
}

function matchingSecurity() {
	return seedCourses.filter((course) => [course.title, course.summary, ...course.tags].some((value) => value.toLocaleLowerCase('en').includes('security')));
}

function sortedBy(courses: readonly { id: string; title: string; createdAt: string }[], field: 'title' | 'createdAt') {
	return [...courses].sort((left, right) => {
		const primary = field === 'title' ? left.title.localeCompare(right.title, 'en', { sensitivity: 'base' }) : left.createdAt.localeCompare(right.createdAt);
		return primary === 0 ? left.id.localeCompare(right.id) : primary;
	});
}
