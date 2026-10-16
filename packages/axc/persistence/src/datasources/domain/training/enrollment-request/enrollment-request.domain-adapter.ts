import type { EnrollmentRequestProps } from '@axc/domain';
export const cloneEnrollmentRequest = (props: EnrollmentRequestProps): EnrollmentRequestProps => ({ ...props, statusHistory: props.statusHistory.map((entry) => ({ ...entry })) });
