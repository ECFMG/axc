# Cellix Alignment Review

Complete this review after implementation and before the final verification commands.

## Reference Evidence

1. Which local Cellix files were inspected?
2. Which reference is the closest analogous vertical slice?
3. Which applicable Cellix capability or package was reused?
4. What are the applicable reference and planned destination trees, including parent and sibling composition files?
5. Which reference files, suffixes, exports, tests, and behavior apply? Which were intentionally omitted, and why?

## Responsibility Placement

1. Where are domain concepts, invariants, entity references, and mutation-side repository or unit-of-work contracts defined?
2. Where are application operations implemented?
3. Where are read-repository interfaces and implementations defined? Are they in persistence rather than domain?
4. Where is state or fixture data owned, and what abstraction hides it?
5. Does each needed file follow the analogous Cellix folder structure, filename suffix, interface, and public export? Are repositories composed at the applicable entity, context, and data-source levels rather than assembled centrally without justification?
6. Is one context name used across domain, application services, persistence, data-source namespaces, and public API types?
7. Does application-service context composition alias entity APIs and declare explicit service interfaces, as in Cellix?
8. Where are application-facing input, output, and error contracts defined? Does production transport avoid importing persistence contracts and unnecessary domain internals?
9. Where are request validation and HTTP error mapping implemented?
10. Are package root `index.ts` files limited to public contracts, exports, and composition?

## Dependency Direction

1. Does domain avoid application, transport, persistence, and infrastructure dependencies?
2. Does API composition inject the data-sources factory through context, and do application services avoid constructing a concrete persistence adapter or depending on concrete infrastructure?
3. Does production transport depend on application services as its feature boundary, without importing persistence contracts or accessing persistence directly? Is every direct domain import supported by the selected Cellix pattern?
4. Are queries read through a read-side data source?
5. Are mutations executed through the appropriate unit-of-work or transaction boundary?

## Behavioral Evidence

1. Is each requirement mapped to an owning layer and a focused test or justified alternative?
2. Do composed public-path tests prove the externally visible workflow?
3. For each specified failure, do tests assert both the status or result and the error code?
4. Do tests verify material response, state-transition, and audit fields directly rather than only counts or broad status checks?
5. If an adapter differs from the Cellix reference technology, which observable semantics must match, and where are the relevant commit, rollback, isolation, serialization, or copying behaviors tested?
6. When contract documentation is required, does it cover every affected operation's input, success output, status or result, and specified errors?

## Deviations

Number every deviation from the selected Cellix references. For each deviation, state:

- the affected file or package;
- why the reference pattern does not apply directly;
- the alternative chosen;
- the cost of changing to the reference pattern later.

An unexplained deviation is a defect. A justified deviation is review evidence, not an automatic failure.

## Completion Decision

Do not report completion until:

- architecture tests pass;
- no feature data or business operation remains in a composition root;
- read-side repository contracts are in persistence, and context, composition, and filename conventions match the applicable Cellix slice;
- production transport does not depend on persistence contracts, and any direct domain dependency is justified by the reference;
- required feature behavior and files have been implemented or their omission justified;
- required tests and documentation are complete against the task evidence matrix;
- focused tests cover rules at their owning layer; composed HTTP tests do not substitute for domain transition tests, application-service invariant tests, or applicable custom-adapter commit, rollback, isolation/serialization, and defensive-copy tests;
- no available Cellix capability has been unnecessarily recreated;
- all deviations are documented;
- `pnpm run verify` has passed, or an external security scan is accurately reported as unavailable after every non-external stage passes;
- Biome and Knip have no patch-introduced findings, including formatting, import-order, unused-export, and unused-type findings.
