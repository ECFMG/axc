import { describe, expect, it } from 'vitest';
import { isCourseStatus, isModality } from './course.value-objects.ts';

describe('course value objects', () => {
	it('validates modality', () => {
		expect(isModality('in-person')).toBe(true);
		expect(isModality('remote')).toBe(false);
	});
	it('validates status', () => {
		expect(isCourseStatus('retired')).toBe(true);
		expect(isCourseStatus('archived')).toBe(false);
	});
});
