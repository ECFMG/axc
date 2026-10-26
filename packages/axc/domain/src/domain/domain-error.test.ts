import { describe, expect, it } from 'vitest';
import { DomainError, invalidRequest } from './domain-error.ts';

describe('DomainError', () => {
	it('carries a code and field details', () => {
		const error = invalidRequest([{ field: 'f', message: 'm' }]);
		expect(error).toBeInstanceOf(DomainError);
		expect([error.code, error.message, error.details]).toEqual(['INVALID_REQUEST', 'The request could not be completed.', [{ field: 'f', message: 'm' }]]);
		expect(new DomainError('COURSE_NOT_FOUND', 'x').details).toEqual([]);
	});
});
