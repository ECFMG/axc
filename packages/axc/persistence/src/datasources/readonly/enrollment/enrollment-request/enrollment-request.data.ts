import type { Models } from '@axc/service-mongoose';
import { MongoDataSourceImpl } from '../../mongo-data-source.ts';

export class EnrollmentRequestDataSource extends MongoDataSourceImpl<Models.EnrollmentRequest.EnrollmentRequest> {}
