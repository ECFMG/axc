import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { CourseModelFactory, CourseModelName, type CourseModelType } from './course.model.ts';

export const getModels = (service: MongooseSeedwork.MongooseContextFactory): { Course: CourseModelType } => ({ [CourseModelName]: CourseModelFactory(service) });
