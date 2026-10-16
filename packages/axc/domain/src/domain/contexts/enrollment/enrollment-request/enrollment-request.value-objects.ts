import { VOString } from '@lucaspaganini/value-objects';

export const RequestStatusTypes = {
	Pending: 'pending',
	Approved: 'approved',
	Rejected: 'rejected',
	Cancelled: 'cancelled',
} as const;

export class CourseId extends VOString({
	trim: true,
	minLength: 1,
	maxLength: 200,
}) {}
export class LearnerEmail extends VOString({
	trim: true,
	minLength: 3,
	maxLength: 320,
}) {}
export class Justification extends VOString({
	trim: true,
	minLength: 20,
	maxLength: 500,
}) {}
export class Status extends VOString({
	trim: true,
	minLength: 1,
	maxLength: 20,
}) {}
