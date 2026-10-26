import { describe, expect, it } from 'vitest';
import { InMemoryCourseRepository } from './course.in-memory-repository.ts';
import { courseSeed } from './course.seed.ts';

describe('InMemoryCourseRepository', () => {
	it('seeds at least 12 mixed courses', async () => {
		const all = await new InMemoryCourseRepository().getAll();
		expect(all.length).toBeGreaterThanOrEqual(12);
		expect(new Set(courseSeed.map((c) => c.modality)).size).toBe(3);
		expect(new Set(courseSeed.map((c) => c.status)).size).toBe(3);
	});
	it('gets, saves, and rejects unknown ids', async () => {
		const repo = new InMemoryCourseRepository([]);
		const course = repo.getNewInstance({ ...courseSeed[0], id: 'x' } as (typeof courseSeed)[0]);
		await repo.save(course);
		await expect(repo.get('x')).resolves.toBe(course);
		await expect(repo.getById('missing')).rejects.toThrow('not found');
	});
});
