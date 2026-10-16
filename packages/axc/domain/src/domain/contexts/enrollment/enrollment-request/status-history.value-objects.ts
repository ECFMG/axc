import { VOString } from '@lucaspaganini/value-objects';

export interface StatusHistoryProps {
	fromStatus: string | null;
	toStatus: string;
	changedAt: Date;
	changedBy: string;
	reason: string | null;
}

export class HistoryToStatus extends VOString({
	trim: true,
	minLength: 1,
	maxLength: 20,
}) {}
export class ChangedBy extends VOString({
	trim: true,
	minLength: 1,
	maxLength: 320,
}) {}
