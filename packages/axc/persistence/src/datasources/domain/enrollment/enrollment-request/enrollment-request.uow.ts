import type { Domain } from '@axc/domain';
import type { Models } from '@axc/service-mongoose';
import { InProcEventBusInstance, NodeEventBusInstance } from '@cellix/event-bus-seedwork-node';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { EnrollmentRequestConverter } from './enrollment-request.domain-adapter.ts';
import { EnrollmentRequestRepository } from './enrollment-request.repository.ts';

export const getEnrollmentRequestUnitOfWork = (
	enrollmentRequestModel: Models.EnrollmentRequest.EnrollmentRequestModelType,
	passport: Domain.Contexts.Passport,
): Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestUnitOfWork => {
	const unitOfWork = new MongooseSeedwork.MongoUnitOfWork(InProcEventBusInstance, NodeEventBusInstance, enrollmentRequestModel, new EnrollmentRequestConverter(), EnrollmentRequestRepository);
	return MongooseSeedwork.getInitializedUnitOfWork(unitOfWork, passport);
};
