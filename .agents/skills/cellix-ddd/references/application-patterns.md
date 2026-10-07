# Cellix Application Patterns

Use this reference when implementing or correcting application architecture.

`/Volumes/files/src/cellixjs` is the authoritative implementation reference.
Trace the relevant pattern through the layers it requires rather than copying
one isolated file or application-specific concept.

## Queries

For read-only behavior that does not require aggregate behavior:

1. Inspect a Cellix application-service query.
2. Trace its read repository or data-source contract into persistence.
3. Inspect the applicable `@cellix/mongoose-seedwork` read-side abstraction.
4. Trace how the concrete implementation is supplied to application services.

Application services orchestrate queries. They should not own queryable
application state or implement persistence.

## Commands

For behavior that changes domain state:

1. Inspect the aggregate behavior in the domain.
2. Trace its repository through persistence.
3. Inspect the applicable Unit of Work pattern.
4. Trace the corresponding application-service command.

Application services coordinate the use case and Unit of Work. Aggregates own
business behavior, invariants, and state transitions.

## Persistence

When persistence is required, inspect both:

- the reusable abstraction in Cellix seedwork; and
- a concrete Cellix application implementation.

Trace the contract, adapter, mapping or conversion, and composition together.

Do not keep application data in application services merely because the feature
or backing store is small.

## Transport and Composition

Transport adapts the external protocol to application-service operations.

Trace application composition through the established Cellix bootstrap,
context, application-services factory, and transport registration patterns.

Concrete dependencies should meet at the composition root rather than being
constructed ad hoc inside transport or application services.

## Applying a Reference

Use Cellix examples to determine:

- responsibility boundaries;
- framework abstractions;
- dependency direction;
- repository, data-source, and Unit of Work usage;
- lifecycle and composition.

Do not copy unrelated domain concepts, authorization models, transports, or
infrastructure merely because they coexist in an example.