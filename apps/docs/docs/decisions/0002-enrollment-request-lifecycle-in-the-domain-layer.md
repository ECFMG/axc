# 2. Enrollment request lifecycle rules live in the domain layer

- Status: accepted
- Date: 2026-10-12
- Deciders: agentCourses maintainers

## Context and problem statement

The enrollment request workflow carries real rules: which status transitions are legal, when a
rejection reason is mandatory, what makes a learner's request a duplicate, and the requirement
that every change appends an audit entry. These rules could reasonably be enforced in the Hono
route handlers, in the application services, or in the domain.

## Considered options

1. **Rules in `@axc/domain`**, with the application services orchestrating and the REST layer
   mapping errors onto HTTP.
2. **Rules in the Hono route handlers**, close to the HTTP contract they serve.
3. **Rules split**: input validation at the edge, state transitions in the domain.

## Decision outcome

Chosen option: **rules in `@axc/domain`**.

- `@axc/domain` owns the models, the transition table, the validators that turn untrusted input
  into commands, and an `AxcDomainError` carrying a stable machine-readable `code`.
- `@axc/application-services` orchestrates: validate, load, check cross-aggregate rules
  (course is active, no duplicate active request), apply, save.
- `@axc/rest` maps `AxcDomainError.code` onto an HTTP status through a single lookup table and
  renders the shared error envelope. It contains no business rules.

Keeping the HTTP status mapping in exactly one place is what makes the contract consistent:
`409` always means "the request was well-formed but conflicts with current state", and every
`400` carries a `details` array naming the offending fields.

### Consequences

- **Good:** rules are unit-testable without HTTP, and are enforced no matter which caller reaches
  them. The REST suite exercises the same rules through real services.
- **Good:** adding a delivery mechanism (GraphQL, a queue consumer) reuses the rules unchanged.
- **Good:** `applyStatusChange` returns a new request rather than mutating, so a rejected
  transition cannot leave a partially-updated aggregate behind.
- **Bad:** validation of untrusted shapes (`unknown` → command) sits in the domain, which some
  readers expect to find at the edge. The trade accepted here is that the length, format, and
  enum rules *are* domain rules, and splitting them would duplicate them.
