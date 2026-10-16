import type { EnrollmentRequestModelType } from '@axc/data-sources-mongoose-models';
import type { Domain } from '@axc/domain';
import { InProcEventBusInstance, NodeEventBusInstance } from '@cellix/event-bus-seedwork-node';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { EnrollmentRequestConverter } from './enrollment-request.domain-adapter.ts';
import { EnrollmentRequestRepository } from './enrollment-request.repository.ts';

export const getEnrollmentRequestUnitOfWork = (model: EnrollmentRequestModelType, passport: Domain.Passport): Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestUnitOfWork => {
	const unitOfWork = new MongooseSeedwork.MongoUnitOfWork(InProcEventBusInstance, NodeEventBusInstance, model, new EnrollmentRequestConverter(), EnrollmentRequestRepository);
	return MongooseSeedwork.getInitializedUnitOfWork(unitOfWork, passport);
};
