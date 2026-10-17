import { describe, expect, it } from 'vitest';
import { createStore } from '../../../store.ts';
import { EnrollmentRequestPersistence } from './index.ts';

describe('EnrollmentRequestPersistence', () => {
	it('exposes an initialized unit of work', () => {
		expect(EnrollmentRequestPersistence(createStore()).EnrollmentRequestUnitOfWork.withScopedTransaction).toBeTypeOf('function');
	});
});
