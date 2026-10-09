import type { CourseModelType } from '@axc/data-sources-mongoose-models';
import type { Domain } from '@axc/domain';
import { InProcEventBusInstance, NodeEventBusInstance } from '@cellix/event-bus-seedwork-node';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { CourseConverter } from './course.domain-adapter.ts';
import { CourseRepository } from './course.repository.ts';

export const getCourseUnitOfWork = (model: CourseModelType, passport: Domain.Passport): Domain.Contexts.Course.Course.CourseUnitOfWork => {
	const unitOfWork = new MongooseSeedwork.MongoUnitOfWork(InProcEventBusInstance, NodeEventBusInstance, model, new CourseConverter(), CourseRepository);
	return MongooseSeedwork.getInitializedUnitOfWork(unitOfWork, passport);
};
