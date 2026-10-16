import type { EnrollmentRequestProps } from '@axc/domain';
import { EnrollmentRequestPersistence } from './enrollment-request/index.ts';
export const TrainingContext = (records: Map<string, EnrollmentRequestProps>) => ({ EnrollmentRequest: EnrollmentRequestPersistence(records) });
