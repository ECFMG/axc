---
name: cellix-ddd
description: >
  Apply CellixJS Domain-Driven Design when implementing AXC application
  behavior across domain, application services, persistence, or transport.
---

# Cellix DDD

Implement application behavior using established CellixJS DDD patterns.

`/Volumes/files/src/cellixjs` is the architectural reference. Inspect the
closest analogous Cellix implementation before introducing a new pattern.

## Domain Modeling

Start from the bounded context and use case, not from the API endpoint.

- Identify the domain concepts, behavior, and invariants involved.
- Model behavior using entities, value objects, aggregates, and domain services
  according to their semantics.
- Aggregate roots define consistency boundaries and protect invariants.
- Keep business rules, invariants, and state transitions in the domain.
- Use `@cellix/domain-seedwork` and established Cellix patterns.
- Avoid anemic domain models whose behavior lives in application services.

DDD applies even when functionality is small. Keep the model proportional
without collapsing architectural boundaries or adding abstractions with no
meaningful domain responsibility.

## Cellix Application Flow

- **Transport** adapts GraphQL/REST requests to application-service operations
  and maps application results back to the client.
- **Application services** orchestrate use cases, Unit of Work, repositories,
  domain behavior, and infrastructure services.
- **Domain** owns business behavior and invariants.
- **Persistence/infrastructure** provide repositories, data sources, Unit of
  Work, and external service implementations.
- **Composition roots** wire concrete implementations together.

For a typical state-changing use case:

`Transport -> Application Service -> Unit of Work / Repository -> Domain -> Persistence -> Application Service -> Transport`

The application service owns orchestration around the domain operation.
The domain owns the business operation itself.

Application services should not implement domain rules or own application state.
- Commands that change aggregate state execute domain behavior within the
  appropriate repository/Unit of Work flow.
- Queries that do not require domain behavior may use established Cellix
  read-side repository/data-source patterns without hydrating an aggregate.

Domain code must remain independent of transport and infrastructure concerns.

## Implementation

Before changing application code:

1. Identify the bounded context, use case, domain concepts, and invariants.
2. Classify the use case as a command, query, or combination of both.
3. Use `references/application-patterns.md` to trace the relevant Cellix
   pattern through the affected layers.
4. Determine the responsibility boundaries for the implementation.
5. Implement using `tdd`.

Before completion, verify:

- business behavior and invariants live in the domain;
- aggregate boundaries are preserved;
- application services primarily orchestrate;
- persistence is mediated through established Cellix abstractions;
- transport and infrastructure concerns remain outside the domain;
- established Cellix patterns were reused where applicable.