// The vendored @cellix/domain-seedwork exposes one subpath per concept. Re-exporting them as the
// DomainSeedwork / PassportSeedwork namespaces matches upstream Cellix usage and the Cellix
// domain conventions (which match `extends DomainSeedwork.AggregateRoot<`).
export * as DomainSeedwork from './domain-seedwork.ts';
export * as PassportSeedwork from './passport-seedwork.ts';
