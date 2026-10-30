import { VOString } from '@lucaspaganini/value-objects';

export class Title extends VOString({
	trim: true,
	minLength: 1,
	maxLength: 200,
}) {}
export class Summary extends VOString({
	trim: true,
	minLength: 1,
	maxLength: 200,
}) {}
