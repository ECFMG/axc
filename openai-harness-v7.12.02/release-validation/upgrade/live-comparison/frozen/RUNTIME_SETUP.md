# Local runtime setup

No OpenAI API key or hosted model was used. The measured coding runs use an already installed Ollama model, `gemma4:26b`. Use a quiet local server. The harness unloads that selected model before every measured call.

## Tools used

- Python 3.9 and Git.
- Node 24.19.0 and the repository-pinned pnpm 11.9.0.
- Ollama 0.34.4; the exact model digest is saved in `benchmark/protocol.json`.
- MongoDB 7.0.24, downloaded through the locked `mongodb-memory-server` package into an external cache.
- Azure Functions Core Tools 4.15.1, macOS arm64, with extension bundle 4.38.1.
- Existing Eclipse Temurin Java 25.0.4.1 for Serenity reporting.

Large binaries, dependency stores, model weights and `node_modules` are intentionally excluded from this package. Install the tools appropriate to your operating system. Core Tools came from the [official release](https://github.com/Azure/azure-functions-core-tools/releases/tag/4.15.1). Download URLs and SHA-256 records are included in `runtime-evidence/downloads.json`.

Restore only locked target dependencies:

```sh
pnpm install --frozen-lockfile --ignore-scripts --store-dir /path/to/pnpm-store
```

The benchmark subsequently uses `--offline` with that populated store. The experiment made no dependency, lockfile, production configuration, authentication or Cellix source changes. Runtime downloads are a documented development-tool exception to the task's external-service restriction; generation and tests use local services.

## Local test environment

Set tool paths for your installation. The example paths below are placeholders:

```sh
export PATH=/path/to/node/bin:/path/to/pnpm/bin:/path/to/core-tools:$PATH
export JAVA_HOME=/path/to/your/jdk
export MONGOMS_DOWNLOAD_DIR=/path/to/mongodb-cache
export FUNCTIONS_CORE_TOOLS_TELEMETRY_OPTOUT=1
export DOTNET_CLI_TELEMETRY_OPTOUT=1
export TURBO_TELEMETRY_DISABLED=1
export NO_UPDATE_NOTIFIER=1
export AzureFunctionsJobHost__extensionBundle__downloadPath=/path/to/extension-cache
export AzureFunctionsJobHost__extensionBundle__ensureLatest=false
```

Warm the MongoDB binary cache once, from `packages/cellix/mongoose-seedwork` in the target repository:

```sh
node --input-type=module -e 'import { MongoMemoryReplSet } from "mongodb-memory-server"; const server = await MongoMemoryReplSet.create({replSet:{count:1}}); await server.stop();'
```

After the documented tools and extension bundle have downloaded successfully, the experiment uses:

```sh
export MONGOMS_RUNTIME_DOWNLOAD=false
export FUNCTIONS_CORE_TOOLS_OFFLINE=true
```

On this sandboxed macOS host, the default .NET file watcher stalled even on an empty diagnostic app. The following settings made the host start and all HTTP acceptance scenarios pass:

```sh
export DOTNET_USE_POLLING_FILE_WATCHER=1
export ASPNETCORE_hostBuilder__reloadConfigOnChange=false
```

They were applied in an external `func` wrapper before final validation of any measured trial. No target `host.json` changed. Core Tools also requires access to its user settings directory, `~/.azurefunctions`; the user approved that specific permission.

The full `pnpm test` command exercises local MongoDB and Azure Functions and runs the Java-based Serenity reporter. The separately validated reference implementation passed this command with 596 unit tests and three HTTP acceptance scenarios represented in its logs. Turborepo reused verified local results for some tasks; acceptance scenarios ran again. Lint, build, typecheck, architecture checks and both independent course-verifier modes also passed. This reference result is not counted as a successful model trial.

## Run the packaged harness

```sh
cd /path/to/openai-harness-v7/harness
python3 -B -m unittest discover -v
python3 -B coding_benchmark.py \
  --repository /path/to/axc \
  --base fe47c38d32376c5e8bcd1d67838160064fd5de99 \
  --work /path/to/new-checkouts \
  --store /path/to/pnpm-store \
  --out /path/to/new-evidence
```

Use new output and checkout locations for each experiment. Do not overwrite earlier failed runs or tune the prompt between variants. The target repository must contain the specified starting commit and its referenced requirements file. See `harness/CODING_TASKS.md` for single-run commands, controls and claim rules.
