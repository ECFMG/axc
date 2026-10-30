import type { Course } from '@axc/data-sources-mongoose-models';
import { type MongoDataSource, MongoDataSourceImpl } from '../../mongo-data-source.ts';

export interface CourseDataSource extends MongoDataSource<Course> {}

export class CourseDataSourceImpl extends MongoDataSourceImpl<Course> implements CourseDataSource {}
