import type { Visa } from '@cellix/domain-seedwork/visa';
import type { CourseDomainPermissions } from './course.domain-permissions.ts';

export interface CourseVisa extends Visa<CourseDomainPermissions> {
	determineIf(func: (permissions: Readonly<CourseDomainPermissions>) => boolean): boolean;
}
