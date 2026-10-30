import { describe, expect, it } from 'vitest';
import { courseSeed, InMemoryCourseRepository } from './course.in-memory-repository.ts';

describe('InMemoryCourseRepository', () => {
	it('seeds at least 12 mixed courses', async () => {
		const all = await new InMemoryCourseRepository().getAll();
		expect(all.length).toBeGreaterThanOrEqual(12);
		expect(new Set(courseSeed.map((c) => c.modality)).size).toBe(3);
		expect(new Set(courseSeed.map((c) => c.status)).size).toBe(3);
	});
	it('gets, saves and rejects unknown ids', async () => {
		const repo = new InMemoryCourseRepository([]);
		const course = repo.getNewInstance({ ...(courseSeed[0] as (typeof courseSeed)[0]), id: 'x' });
		await repo.save(course);
		expect((await repo.get('x')).title).toBe(course.title);
		await expect(repo.getById('missing')).rejects.toThrow();
	});
});
