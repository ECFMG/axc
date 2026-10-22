import { expect, it } from 'vitest';
import { createStore } from '../../../store.ts';
import { EnrollmentRequestPersistence } from './index.ts';

it('composes an initialized unit of work', () => {
	expect(EnrollmentRequestPersistence(createStore()).EnrollmentRequestUnitOfWork.withScopedTransaction).toBeTypeOf('function');
});
