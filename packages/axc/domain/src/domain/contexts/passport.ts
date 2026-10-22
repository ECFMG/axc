import type { EnrollmentDomainPermissions } from './enrollment/enrollment.domain-permissions.ts';
import type { EnrollmentVisa } from './enrollment/enrollment.visa.ts';
import type { EnrollmentRequestEntityReference } from './enrollment/enrollment-request/enrollment-request.entity.ts';

/** Grants visas per context. Aggregates ask their context's passport for a visa and check permissions through it. */
export interface Passport {
	readonly enrollment: {
		forEnrollmentRequest(root: EnrollmentRequestEntityReference): EnrollmentVisa;
	};
}

const allow =
	<T>(permissions: T) =>
	(): { determineIf(check: (permissions: Readonly<T>) => boolean): boolean } => ({ determineIf: (check) => check(permissions) });

/** The API has no end-user authentication; requests run with the system passport. */
export const PassportFactory = {
	forSystem(): Passport {
		return { enrollment: { forEnrollmentRequest: allow<EnrollmentDomainPermissions>({ canReviewEnrollmentRequests: true }) } };
	},
};
