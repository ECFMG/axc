import type { Models } from '@axc/service-mongoose';
import { MongoDataSourceImpl } from '../../mongo-data-source.ts';

export class CourseDataSource extends MongoDataSourceImpl<Models.Course.Course> {}
