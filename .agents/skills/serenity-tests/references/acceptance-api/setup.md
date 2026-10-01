# API Acceptance Setup

Use this guide when creating or changing an API acceptance suite built with
Cucumber, Serenity/JS, and `@cellix/serenity-framework`.

## Discover the Consumer Suite

Before changing setup, inspect the consumer project's:

- package manifest and acceptance-test scripts
- Cucumber configuration
- feature and support-file locations
- world, hooks, and infrastructure setup
- existing actor cast and Abilities
- application startup and test-server lifecycle
- neighboring acceptance tests

Do not assume a particular transport, module system, Cucumber config filename,
feature-sharing strategy, parallelism setting, or reporting format.

Preserve established project conventions unless the task requires changing
them.

## Package Responsibilities

Keep generic Serenity, Cucumber, infrastructure, and server-lifecycle
capabilities in `@cellix/serenity-framework`.

Keep consumer-specific concerns in the acceptance package, including:

- feature files and step definitions
- application Tasks, Interactions, Questions, and Abilities
- transport clients and operations
- test data and fixtures
- application server construction
- persistence or external-service test infrastructure

Reuse dependency versions and package-management conventions already established
by the consumer repository.

## Cucumber Configuration

Configure Cucumber around the consumer project's actual suite.

- Point feature paths at the project's intended `.feature` files.
- Load the world, hooks, and step definitions required by the suite.
- Preserve the project's TypeScript loader and module system.
- Preserve existing formatter and reporting conventions.
- Choose parallel execution only when scenario and infrastructure isolation make
  it safe.

Do not import configuration from another application merely because it also
uses Serenity/JS.

## Infrastructure

Use managed infrastructure when acceptance behavior requires real application
processes, in-memory servers, databases, or other runtime dependencies.

When using `ApiInfrastructure`:

- register servers in dependency order
- declare dependencies explicitly
- keep concrete server constructors in the consumer project
- expose ready `TestServer` instances to the framework
- reset scenario state between scenarios
- stop managed infrastructure when the suite completes

The framework should manage lifecycle. It should not know application package
paths or construct application-specific servers itself.

## World and Actor Cast

When using `registerManagedSerenityWorld`:

- validate required infrastructure state before building the actor cast;
- give actors only the Abilities required to interact with the application;
- keep transport-specific Ability construction in the consumer project;
- initialise the world before each scenario;
- clean scenario state after each scenario;
- stop shared infrastructure after the suite completes.

Abilities represent actor capabilities, such as interacting with an HTTP or
GraphQL API. They should not become one wrapper per business use case.

## Build Integration

Acceptance tests must run against the application artifacts and runtime they
actually exercise.

Configure the repository build system so required upstream packages are built
before acceptance execution.

Keep process-backed acceptance tasks uncached unless the suite is known to be
deterministic, isolated, and safe to cache.

Use the consumer project's existing validation commands rather than inventing
alternate repository-wide commands.