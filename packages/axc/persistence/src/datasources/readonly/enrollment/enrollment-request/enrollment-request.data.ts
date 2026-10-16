import type { EnrollmentRequest } from '@axc/data-sources-mongoose-models';
import { type MongoDataSource, MongoDataSourceImpl } from '../../mongo-data-source.ts';

export interface EnrollmentRequestDataSource extends MongoDataSource<EnrollmentRequest> {}

export class EnrollmentRequestDataSourceImpl extends MongoDataSourceImpl<EnrollmentRequest> implements EnrollmentRequestDataSource {}
