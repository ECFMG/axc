import { VOArray, VOString } from '@lucaspaganini/value-objects';

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
export class Modality extends VOString({
	trim: true,
	minLength: 1,
	maxLength: 200,
}) {}
export class Status extends VOString({
	trim: true,
	minLength: 1,
	maxLength: 200,
}) {}

class Tag extends VOString({
	trim: true,
	minLength: 1,
	maxLength: 40,
}) {}

export class Tags extends VOArray(Tag, { maxLength: 20 }) {}
