import { describe, expect, it } from 'vitest';
import { isCourseModality, isCourseStatus, Modality, Status } from './course.value-objects.ts';

describe('course value objects', () => {
	it('accepts allowed values', () => {
		expect(new Modality('in-person').value).toBe('in-person');
		expect(new Status('retired').value).toBe('retired');
		expect(isCourseModality('hybrid')).toBe(true);
		expect(isCourseStatus('draft')).toBe(true);
	});
	it('rejects unknown values', () => {
		expect(() => new Modality('Online')).toThrow();
		expect(() => new Status('archived')).toThrow();
		expect(isCourseModality('x')).toBe(false);
	});
});
