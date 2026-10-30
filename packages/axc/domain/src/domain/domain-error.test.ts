import { describe, expect, it } from 'vitest';
import { DomainError, invalidRequest } from './domain-error.ts';

describe('DomainError', () => {
	it('carries code and details; invalidRequest uses INVALID_REQUEST', () => {
		const err = invalidRequest([{ field: 'x', message: 'bad' }]);
		expect(err).toBeInstanceOf(DomainError);
		expect(err).toMatchObject({ code: 'INVALID_REQUEST', message: 'The request could not be completed.', details: [{ field: 'x', message: 'bad' }] });
		expect(new DomainError('X', 'm').details).toEqual([]);
	});
});
