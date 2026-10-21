# AgentCourses Agent Instructions

## Scope

These instructions apply to the entire repository. Preserve the user's task and the fixed task-set prompts. Do not edit `task-set-*-prompt.md` or `task-set-*-requirements.md` unless the user explicitly requests changes to those files.

## Harness Run Discipline

For feature runs, follow the [run workflow](.agents/harness-run-workflow.md). A task clause that permits adding justified dependencies also permits the package manager to update the root lockfile for dependency declarations made in package manifests inside the allowed write boundary, unless the task explicitly prohibits lockfile changes. Keep the lockfile diff limited to the justified dependency changes. Identify required workspace dependency edges before implementation; obtain a boundary exception before changing any other root workspace file.

Do not stage, commit, push, or bypass hooks unless the user requests that operation. Do not conceal a failed security scan.

## Cellix Architecture Source of Truth

Treat the local Cellix repository at `/Volumes/files/src/cellixjs` as the authoritative reference for architecture, framework conventions, package structure, naming, testing patterns, and reusable infrastructure. If it is unavailable, use <https://github.com/CellixJs/cellixjs>.

For changes under `apps/api`, `packages/axc`, or `packages/axc-verification`, read and follow `.agents/skills/cellix-architecture/SKILL.md` before implementation.

Before writing code:

1. Classify every feature concept by domain identity and lifecycle as an aggregate root, child entity, value object, or derived projection. A persisted business object with its own identity and lifecycle is an aggregate candidate even if the current task exposes only reads; absence of write endpoints is not evidence that the object is permanently read-only. Reserve projection for a derived view without independent domain identity or lifecycle. Do not infer domain shape from endpoint count or task size.
2. Locate the closest analogous vertical slice in Cellix by domain behavior and ownership. Inspect an aggregate slice for a persisted business object even when the current API only queries it. A persisted workflow with creation, state transitions, audit or history, nested lifecycle, or transactional invariants must inspect the full `case/service-ticket/v1` slice; a read-model slice describes the query adapter, not the underlying domain object's classification.
3. Inventory the applicable reference tree for composition, domain, application services, persistence or data sources, transport, and tests. For a command aggregate, include the aggregate, props and entity reference, value objects, child entities, repository, unit of work, visa or passport when authorization applies, events when required by the reference behavior, persistence adapters and converters, sibling and parent `index.ts` files, and focused tests. Package-level similarity is insufficient.
   For a stateful command workflow, inspect all four files and their test companions in `packages/ocom/persistence/src/datasources/domain/case/service-ticket-v1`: `service-ticket-v1.domain-adapter.ts` (including `ServiceTicketV1Converter`), `service-ticket-v1.repository.ts`, `service-ticket-v1.uow.ts`, and `index.ts`. Map each responsibility separately; a storage collection named `*.domain-adapter.ts` does not satisfy the adapter or converter role.
4. Choose one context name and map each needed responsibility and planned file to its exact Cellix counterpart before writing code.
5. Record every applicable reference file or behavior that will be omitted and why it does not apply. Complexity, implementation speed, and passing end-to-end tests are not valid omission reasons. An omission without a behavior-based reason is a defect to resolve during review.

## Architecture Invariants

- Keep `apps/api` as the composition root. Do not place business rules or storage behavior there.
- Construct or register the data-sources factory in the API composition context and inject it into the application-services host. Do not call a concrete persistence factory such as `createDataSources()` inside `buildApplicationServicesFactory`.
- Keep every persisted business object and its props, entity reference, domain values, and invariants in `packages/axc/domain`, including objects whose current API only queries them, such as Course. Model an independently identified and lifecycle-owned object as a Cellix aggregate root by default; require a behavior-based Cellix justification for a different choice. Put read-side repository interfaces, implementations, and fixture data in `packages/axc/persistence`; a `*ReadRepository` must not live in domain.
- For aggregate roots, implement the applicable Cellix aggregate root, a static `getNewInstance` creation factory, props and entity-reference pattern, value objects, child entities, exports, and focused tests. Keep reconstruction of stored objects distinct from creation through `getNewInstance`; the factory establishes valid initial state. Add mutation-side repository and unit-of-work contracts and adapters when commands are in scope; record their deferred responsibilities when commands are not yet exposed. Creation plus state transitions, audit or history, nested lifecycle, or transactional invariants require the full applicable command-side pattern. Do not model an aggregate as a public mutable record operated on by free mutation functions.
- Represent constrained or normalized domain values with Cellix-aligned value objects. Model nested records as child entities, value objects, or prop arrays according to identity and lifecycle; do not leave those decisions implicit in transport or persistence types.
- Mutation repositories and units of work must extend or reuse the corresponding `@cellix/domain-seedwork` contracts. Do not introduce a reduced project-local substitute. Include visa or passport checks, domain events, and versioning when the selected behavioral reference requires them; document why each inapplicable capability is omitted.
- For command aggregates, keep the storage record, domain-props adapter, and converter as distinct responsibilities. The adapter exposes stored fields through the aggregate's props contract; the converter reconstructs an existing aggregate from storage and prepares a new storage adapter for `getNewInstance`. The mutation repository uses that conversion boundary for creation, retrieval, and saving; application services request creation through the repository inside the unit of work. The unit of work composes the repository and converter, and the entity persistence `index.ts` exposes the initialized unit of work. An in-memory backing store may replace MongoDB, but raw-record cloning and `new Aggregate(storedProps, ...)` in the repository do not replace the Cellix adapter/converter pattern. Document a behavior-based deviation if a different conversion mechanism is genuinely required.
- Follow the applicable Cellix context/entity directory structure, filename suffixes, public exports, and required feature behavior. For example, use `*.aggregate.ts` for an aggregate root, `*.read-repository.ts` for a read repository, and `*.repository.ts` for a domain repository. A query-only API still needs its matching domain slice and context export. Do not collapse a feature into a root `course.ts` or `readonly/course.ts` when the analogous Cellix slice separates context, entity, and repository files.
- Use the chosen context name consistently across domain, application services, persistence, data-source namespaces, and public APIs. Do not substitute a different context name in one layer.
- Organize application behavior under context and feature modules in `packages/axc/application-services/src/contexts`. Keep the package root focused on host interfaces and composition.
- In application-service context composition, follow the Cellix import pattern: alias each entity API distinctly from its service type, and expose a named context service interface rather than relying only on an inferred return type.
- Define each public application-service command, query, and result contract in the application-service or domain layer. Entity application-service modules may import `DataSources` from persistence for injection, but must not expose persistence query, page, filter, or repository types in their public methods. Compare the analogous Cellix operation file, which declares its query or command input beside the curried operation.
- Give each public entity application-service operation its own context/entity operation file. Keep the entity `index.ts` focused on its named service interface, operation imports, and composition; do not implement queries or mutations inline there.
- Keep application failure codes and details independent of HTTP status numbers. Map failure codes to HTTP statuses in REST feature modules. Test both direct application-service errors and the transport mapping; do not put status numbers in application-service error constructors or types.
- Follow the Cellix curried application-service pattern. Inject `DataSources` first, then accept a command or query input.
- Use `readonlyDataSource` for queries and the domain data source with a scoped transaction for mutations.
- Keep fixture or in-memory storage behind a data-source or repository boundary. Production composition and package entry points must not own fixture collections.
- Compose persistence at the same applicable entity, context, and data-source levels as the closest Cellix slice. Do not replace those composition modules with one root file that imports every concrete repository unless the reference or a documented constraint calls for it.
- Keep `packages/axc/rest/src/index.ts` focused on application construction and feature registration. Put non-health routes, transport validation, and error mapping in feature modules.
- Treat application services as the feature boundary for production transport code. Transport must not import persistence contracts or access persistence or infrastructure directly. Prefer application-service public contracts or transport-local input types over direct domain imports; use a direct domain contract only when the closest Cellix transport pattern requires it and record that decision.
- Enforce business invariants for every public application-service call, including calls that bypass transport. Transport may validate request syntax and map errors, but it must not be the only enforcement point for business rules. Test rejected operations at the layer that owns the rule and confirm they leave state unchanged.
- Test business rules at the layer that owns them, then test the composed public path. When an adapter replaces a Cellix implementation, test the reference semantics it promises, such as commit, rollback, isolation, serialization, or cloning, as applicable. Keep test depth proportional to the behavior and risk.
- Composed HTTP tests do not replace focused tests for domain transition rules, application-service invariants, or custom unit-of-work and repository semantics. For an in-memory transactional adapter, directly test successful commit, rollback after an exception, concurrent serialization or isolation, and defensive copying when those behaviors are implemented.
- For a command persistence slice, add focused tests beside the adapter/converter, repository, unit of work, and entity composition. Prove stored-record ↔ aggregate round trips (including nested audit/history data), creation through the repository factory, and repository retrieval and save through the converter. Unit-of-work tests alone cannot establish these responsibilities.
- Design behavior tests with inputs and expected results that distinguish a correct implementation from a plausible incorrect one. Cover meaningful boundaries and test behaviors independently when combined cases could hide a failure.
- For acceptance criteria with a required number of cases, count distinct executed test inputs and assert complete expected results. In Task Set A, A-AC11 requires two separate course-search filter combinations, including `q` + `modality` + `status`, with data that would expose an ignored predicate. A passing suite with fewer cases does not satisfy the criterion.
- When a task requires API documentation, cover every affected endpoint's request, successful response, status code, and specified error cases. Examples may be concise but must make the contract reviewable. Verify the built page renders required headings, examples, and error tables correctly; a successful docs build alone is insufficient.
- Reuse existing Cellix packages and patterns. Do not create a project-specific replacement for an available Cellix capability.
- Do not modify vendored `packages/cellix/**` code for an application feature. Port upstream Cellix changes exactly when that work is explicitly requested.
- When no close reference exists, use the nearest Cellix pattern and record the deviation and rationale in the alignment review.

## Completion Gate

Before reporting completion:

1. Perform the review in `.agents/skills/cellix-architecture/references/review-template.md`.
2. Compare the implemented tree with the planned Cellix map, including composition files, suffixes, exports, service interfaces, aggregate and value-object semantics, seedwork inheritance, persistence adapter and converter classes, repository creation and rehydration, unit-of-work wiring, test companions, and behavior. Resolve unexplained differences.
3. Run the relevant focused tests, followed by the repository verification gate:

   ```bash
   pnpm run verify
   ```

   Do not replace `pnpm run verify` with a smaller set of commands. It includes script-policy and Biome checks, typecheck, build, rendered API documentation checks, Knip, dependency-efficiency analysis, architecture tests, the full test suite, dependency audit, and Snyk. Resolve every finding introduced by the patch. A failed documentation, Knip, or Biome check is a completion blocker, including missing rendered sections, unused exports, and formatting or import-order findings.

4. If `pnpm run verify` stops because a security service or registry is unavailable, rerun the unchanged failing security command with the required network permission. If it remains unavailable, run any verification stages that did not execute, report the exact unavailable scan, and do not describe it as a pass. Product-code, architecture, formatting, Knip, or test failures are not external limitations and must be fixed before completion.
   During output loops, inspect `pnpm audit --json` and Snyk findings even when an earlier verification stage fails. The pnpm audit gate covers every severity. Resolve findings with published compatible fixes through narrow `pnpm-workspace.yaml` overrides and a refreshed lockfile, then rerun both scans and relevant tests. For a major-version override, verify the dependent package's actual API usage and composed build. Add a Snyk issue ID to `.snyk` only when no usable fixed release exists; record the reason and expiry. Review pnpm's separate `auditConfig.ignoreGhsas` with a reason and recheck date, and remove stale ignores. A `.snyk` ignore does not resolve a separate `pnpm audit` failure. Keep ignored and open findings distinct in the report.
5. Review tracked, staged, and untracked changes against the task boundary and the initial worktree snapshot. Treat an unavailable security scan as unavailable, not as a pass.
6. Follow the task's explicit reporting requirements.
