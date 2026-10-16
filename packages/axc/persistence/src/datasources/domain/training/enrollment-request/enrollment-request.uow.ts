import { Domain } from '@axc/domain';
import { InProcEventBusInstance, NodeEventBusInstance } from '@cellix/event-bus-seedwork-node';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import type { EnrollmentRequestModelType } from '../../../../models/training/enrollment-request.model.ts';
import { EnrollmentRequestConverter } from './enrollment-request.domain-adapter.ts';
import { EnrollmentRequestRepository } from './enrollment-request.repository.ts';
export const getEnrollmentRequestUnitOfWork = (model: EnrollmentRequestModelType): Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork => {
	const unitOfWork = new MongooseSeedwork.MongoUnitOfWork(InProcEventBusInstance, NodeEventBusInstance, model, new EnrollmentRequestConverter(), EnrollmentRequestRepository);
	const initialized = MongooseSeedwork.getInitializedUnitOfWork(unitOfWork, undefined);
	return {
		...initialized,
		async withScopedTransaction(callback) {
			try {
				await initialized.withScopedTransaction(callback);
			} catch (error) {
				if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
					throw new Domain.Contexts.Training.EnrollmentRequest.EnrollmentWorkflowError('DUPLICATE_ACTIVE_REQUEST', 'learnerEmail', 'An active enrollment request already exists for this learner and course.');
				}
				throw error;
			}
		},
	};
};
