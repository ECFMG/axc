/** Sample workflow context; no authentication or authorization is inferred. */
export interface Passport {
	now(): Date;
}
export interface Visa {
	changedBy: string;
}
