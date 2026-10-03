# Cellix Alignment Review

Complete this review after implementation and before the final verification commands.

## Reference Evidence

1. Which local Cellix files were inspected?
2. Which reference is the closest analogous vertical slice?
3. Which applicable Cellix capability or package was reused?
4. Which reference files, suffixes, exports, tests, and behavior apply? Which were intentionally omitted, and why?

## Responsibility Placement

1. Where are domain concepts, invariants, entity references, and mutation-side repository or unit-of-work contracts defined?
2. Where are application operations implemented?
3. Where are read-repository interfaces and implementations defined? Are they in persistence rather than domain?
4. Where is state or fixture data owned, and what abstraction hides it?
5. Does each needed file follow the analogous Cellix folder structure, filename suffix, interface, and public export?
6. Is one context name used across domain, application services, persistence, data-source namespaces, and public API types?
7. Does application-service context composition alias entity APIs and declare explicit service interfaces, as in Cellix?
8. Where are request validation and HTTP error mapping implemented?
9. Are package root `index.ts` files limited to public contracts, exports, and composition?

## Dependency Direction

1. Does domain avoid application, transport, persistence, and infrastructure dependencies?
2. Does API composition inject the data-sources factory through context, and do application services avoid constructing a concrete persistence adapter or depending on concrete infrastructure?
3. Does transport call application services instead of persistence directly?
4. Are queries read through a read-side data source?
5. Are mutations executed through the appropriate unit-of-work or transaction boundary?

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
- read-side repository contracts are in persistence, and context and filename conventions match the applicable Cellix slice;
- required feature behavior and files have been implemented or their omission justified;
- no available Cellix capability has been unnecessarily recreated;
- all deviations are documented;
- the verification commands in `AGENTS.md` have been run or any blocked command has been reported accurately.
