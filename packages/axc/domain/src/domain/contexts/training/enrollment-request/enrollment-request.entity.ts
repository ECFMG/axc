import type { EnrollmentRequestRecord } from './enrollment-request.value-objects.ts';
export interface EnrollmentRequestProps {
	readonly id: string;
	record: EnrollmentRequestRecord;
}
export type EnrollmentRequestEntityReference = Readonly<EnrollmentRequestProps>;
