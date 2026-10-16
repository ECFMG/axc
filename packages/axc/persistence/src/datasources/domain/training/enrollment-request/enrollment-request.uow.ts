import type { Domain } from '@axc/domain';
import { InProcEventBusInstance, NodeEventBusInstance } from '@cellix/event-bus-seedwork-node';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import type { EnrollmentRequestModelType } from '../../../../models/training/enrollment-request.model.ts';
import { EnrollmentRequestConverter, type EnrollmentRequestDomainAdapter } from './enrollment-request.domain-adapter.ts';
import { EnrollmentRequestRepository } from './enrollment-request.repository.ts';
export const getEnrollmentRequestUnitOfWork = (model: EnrollmentRequestModelType, passport: Domain.Contexts.Passport): Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork<EnrollmentRequestDomainAdapter> =>
	MongooseSeedwork.getInitializedUnitOfWork(new MongooseSeedwork.MongoUnitOfWork(InProcEventBusInstance, NodeEventBusInstance, model, new EnrollmentRequestConverter(), EnrollmentRequestRepository), passport);
