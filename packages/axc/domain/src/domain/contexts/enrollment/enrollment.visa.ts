import type { Visa } from '@cellix/domain-seedwork/visa';
import type { EnrollmentDomainPermissions } from './enrollment.domain-permissions.ts';

export interface EnrollmentVisa extends Visa<EnrollmentDomainPermissions> {
	determineIf(func: (permissions: Readonly<EnrollmentDomainPermissions>) => boolean): boolean;
}
