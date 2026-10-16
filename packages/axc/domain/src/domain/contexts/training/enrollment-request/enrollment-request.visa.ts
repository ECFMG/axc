import type * as PassportSeedwork from '@cellix/domain-seedwork/visa';
import type { EnrollmentRequestDomainPermissions } from './enrollment-request.permissions.ts';
export interface EnrollmentRequestVisa extends PassportSeedwork.Visa<EnrollmentRequestDomainPermissions> {}
