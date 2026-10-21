import type { EnrollmentFilter, EnrollmentRequest } from './enrollment-request.ts';

/** Sample repository. Copies prevent callers from changing stored records or history. */
export function createEnrollmentStore() {
	const records = new Map<string, EnrollmentRequest>();
	return {
		get(id: string): EnrollmentRequest | undefined {
			const record = records.get(id);
			return record ? structuredClone(record) : undefined;
		},
		list(filter: EnrollmentFilter = {}): EnrollmentRequest[] {
			return [...records.values()]
				.filter(
					(record) =>
						(filter.status === undefined || record.status === filter.status) &&
						(filter.courseId === undefined || record.courseId === filter.courseId) &&
						(filter.learnerEmail === undefined || record.learnerEmail === filter.learnerEmail),
				)
				.map((record) => structuredClone(record));
		},
		save(record: EnrollmentRequest): void {
			records.set(record.id, structuredClone(record));
		},
	};
}
