import type { Visa } from '@cellix/domain-seedwork/visa';
import type { CatalogDomainPermissions } from './catalog.domain-permissions.ts';

export interface CatalogVisa extends Visa<CatalogDomainPermissions> {
	determineIf(func: (permissions: Readonly<CatalogDomainPermissions>) => boolean): boolean;
}
