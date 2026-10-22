import type { PassportSeedwork } from '../../seedwork/index.ts';
import type { EnrollmentDomainPermissions } from './enrollment.domain-permissions.ts';

export interface EnrollmentVisa extends PassportSeedwork.Visa<EnrollmentDomainPermissions> {}
