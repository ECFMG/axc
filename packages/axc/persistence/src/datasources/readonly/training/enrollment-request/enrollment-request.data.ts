import type { EnrollmentRequestEntityReference, EnrollmentRequestProps } from '@axc/domain';
import type { EnrollmentRequestFilter, EnrollmentRequestReadRepository } from './enrollment-request.read-repository.ts';

const toReference = (props: EnrollmentRequestProps): EnrollmentRequestEntityReference => ({ ...props, statusHistory: props.statusHistory.map((entry) => ({ ...entry })) });
export class InMemoryEnrollmentRequestReadRepository implements EnrollmentRequestReadRepository {
	private readonly records: Map<string, EnrollmentRequestProps>;
	constructor(records: Map<string, EnrollmentRequestProps>) {
		this.records = records;
	}
	async getById(id: string): Promise<EnrollmentRequestEntityReference | null> {
		const props = this.records.get(id);
		return await Promise.resolve(props ? toReference(props) : null);
	}
	async list(filter: EnrollmentRequestFilter): Promise<EnrollmentRequestEntityReference[]> {
		return await Promise.resolve(
			[...this.records.values()]
				.filter((item) => (!filter.status || item.status === filter.status) && (!filter.courseId || item.courseId === filter.courseId) && (!filter.learnerEmail || item.learnerEmail === filter.learnerEmail))
				.map(toReference),
		);
	}
}
