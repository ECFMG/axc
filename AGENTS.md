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

1. Locate the closest analogous vertical slice in Cellix.
2. Inventory the applicable reference tree for composition, domain, application services, persistence or data sources, transport, and tests. Include sibling and parent `index.ts` files, public exports, interfaces, and test companions; package-level similarity is insufficient.
3. Choose one context name and map each needed responsibility and planned file to its Cellix counterpart before writing code.
4. Record every applicable reference file or behavior that will be omitted and why it does not apply. An omission without a reason is a defect to resolve during review.

## Architecture Invariants

- Keep `apps/api` as the composition root. Do not place business rules or storage behavior there.
- Construct or register the data-sources factory in the API composition context and inject it into the application-services host. Do not call a concrete persistence factory such as `createDataSources()` inside `buildApplicationServicesFactory`.
- Keep domain concepts, invariants, entity references, and mutation-side repository or unit-of-work contracts in `packages/axc/domain` when the feature needs them. Put read-side repository interfaces, implementations, and fixture data in `packages/axc/persistence`; a `*ReadRepository` must not live in domain.
- Follow the applicable Cellix context/entity directory structure, filename suffixes, public exports, and required feature behavior. For example, use `*.read-repository.ts` for a read repository and `*.repository.ts` for a domain repository. Do not collapse a feature into a root `course.ts` or `readonly/course.ts` when the analogous Cellix slice separates context, entity, and repository files.
- Use the chosen context name consistently across domain, application services, persistence, data-source namespaces, and public APIs. Do not substitute a different context name in one layer.
- Organize application behavior under context and feature modules in `packages/axc/application-services/src/contexts`. Keep the package root focused on host interfaces and composition.
- In application-service context composition, import entity APIs with a distinct alias and their explicit service type, as Cellix does: `import { Course as CourseApi, type CourseApplicationService } from './course/index.ts';`. Expose a named context service interface instead of relying only on inferred return types.
- Follow the Cellix curried application-service pattern. Inject `DataSources` first, then accept a command or query input.
- Use `readonlyDataSource` for queries and the domain data source with a scoped transaction for mutations.
- Keep fixture or in-memory storage behind a data-source or repository boundary. Production composition and package entry points must not own fixture collections.
- Compose persistence at the same applicable entity, context, and data-source levels as the closest Cellix slice. Do not replace those composition modules with one root file that imports every concrete repository unless the reference or a documented constraint calls for it.
- Keep `packages/axc/rest/src/index.ts` focused on application construction and feature registration. Put non-health routes, transport validation, and error mapping in feature modules.
- Treat application services as the feature boundary for production transport code. Transport must not import persistence contracts or access persistence or infrastructure directly. Prefer application-service public contracts or transport-local input types over direct domain imports; use a direct domain contract only when the closest Cellix transport pattern requires it and record that decision.
- Test business rules at the layer that owns them, then test the composed public path. When an adapter replaces a Cellix implementation, test the reference semantics it promises, such as commit, rollback, isolation, serialization, or cloning, as applicable. Keep test depth proportional to the behavior and risk.
- When a task requires API documentation, cover every affected endpoint's request, successful response, status code, and specified error cases. Examples may be concise but must make the contract reviewable.
- Reuse existing Cellix packages and patterns. Do not create a project-specific replacement for an available Cellix capability.
- Do not modify vendored `packages/cellix/**` code for an application feature. Port upstream Cellix changes exactly when that work is explicitly requested.
- When no close reference exists, use the nearest Cellix pattern and record the deviation and rationale in the alignment review.

## Completion Gate

Before reporting completion:

1. Perform the review in `.agents/skills/cellix-architecture/references/review-template.md`.
2. Compare the implemented tree with the planned Cellix map, including composition files, suffixes, exports, service interfaces, test companions, and behavior. Resolve unexplained differences.
3. Run the relevant focused tests, followed by:

   ```bash
   pnpm run lint
   pnpm run typecheck
   pnpm run build
   pnpm run test:arch
   pnpm run test
   ```

4. Review tracked, staged, and untracked changes against the task boundary and the initial worktree snapshot. Treat an unavailable security scan as unavailable, not as a pass.
5. Follow the task's explicit reporting requirements.
