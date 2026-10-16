import { VOString } from '@lucaspaganini/value-objects';

export const ModalityTypes = {
	Online: 'online',
	InPerson: 'in-person',
	Hybrid: 'hybrid',
} as const;

export const StatusTypes = {
	Draft: 'draft',
	Active: 'active',
	Retired: 'retired',
} as const;

export class Title extends VOString({
	trim: true,
	minLength: 1,
	maxLength: 200,
}) {}
export class Summary extends VOString({
	trim: true,
	minLength: 1,
	maxLength: 500,
}) {}
export class Modality extends VOString({
	trim: true,
	minLength: 1,
	maxLength: 20,
}) {}
export class Status extends VOString({
	trim: true,
	minLength: 1,
	maxLength: 20,
}) {}
