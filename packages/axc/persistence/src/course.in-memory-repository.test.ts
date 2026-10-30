import { describe, expect, it } from 'vitest';
import { InMemoryCourseRepository } from './course.in-memory-repository.ts';

describe('InMemoryCourseRepository', () => {
	it('seeds at least 12 courses with mixed modality and status', async () => {
		const all = await new InMemoryCourseRepository().getAll();
		expect(all.length).toBeGreaterThanOrEqual(12);
		expect(new Set(all.map((c) => c.props.modality)).size).toBe(3);
		expect(new Set(all.map((c) => c.props.status)).size).toBe(3);
	});

	it('gets by id and throws for unknown ids', async () => {
		const repo = new InMemoryCourseRepository();
		expect((await repo.get('course-001')).props.title).toBe('AI Security Foundations');
		await expect(repo.get('nope')).rejects.toThrow('not found');
	});
});
