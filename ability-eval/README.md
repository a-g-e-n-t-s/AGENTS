# ability-eval
> Evaluation engine ability - code diffs, test results, logs, behavior traces analysis

Overview
--------
ability-eval is a kadi-ability implemented in TypeScript. The source entrypoint is index.ts (compiled to dist/index.js for runtime) and it integrates with the Kadi runtime via @kadi.build/core. The package uses tsx for lightweight TypeScript execution in development. Runtime configuration is provided via agent.json and config.toml.

Quick Start
-----------
1. Clone the repository and install Node dependencies:
```bash
npm install
```

2. (Optional) Install Kadi runtime/tools if required by your environment:
```bash
kadi install
```

3. Build and start the ability (production/runtime):
```bash
npm run build
npm run start      # runs `node dist/index.js`
```

3b. Development and immediate execution (no build step):
- Run the TypeScript source directly:
```bash
npm run dev        # runs `npx tsx index.ts`
```
- Run in stdio or broker mode:
```bash
npm run serve        # stdio mode: `npx tsx index.ts stdio`
npm run serve:broker # broker mode: `npx tsx index.ts broker`
```

4. Clean local artifacts:
```bash
npm run clean
# or
rm -rf node_modules package-lock.json agent-lock.json dist
```

Tools
-----
| Tool | Description |
|------|-------------|
| secret-ability (*) | Declared ability dependency used by ability-eval (registered in agent.json under "abilities"). Provides domain-specific evaluation helpers or connectors required by this package. |
| @kadi.build/core (*) | Kadi runtime core used by the ability to register handlers, message routing and lifecycle integration. |
| agents-library (*) | Utility library used by the ability (declared dependency). |
| tsx (^4.21.0) | Lightweight TypeScript runner used by dev/serve scripts to execute index.ts without a separate compile step. |
| typescript (@ dev) (^5.9.3) | Development dependency for type checking and local editing. |
| @types/node (@ dev) (^25.3.1) | Node.js type definitions used during development and type-checking. |

Configuration
-------------
Primary configuration lives in agent.json and config.toml.

Key files and fields:
- agent.json (root)
  - name: "ability-eval"
  - version: "0.1.2"
  - description: "Evaluation engine ability - code diffs, test results, logs, behavior traces analysis"
  - entrypoint: "dist/index.js" (runtime artifact produced by the build step)
  - scripts:
    - preflight: "node --version"
    - setup: "npm install && npm run build"
    - build: "npx tsc"
    - start: "node dist/index.js"
    - dev: "npx tsx index.ts"
    - serve: "npx tsx index.ts stdio"
    - serve:broker: "npx tsx index.ts broker"
    - clean: "rm -rf node_modules abilities agent-lock.json package-lock.json dist"
  - abilities:
    - secret-ability: "*" (registered dependency required at runtime)

- config.toml (root)
  - broker.local
    - URL (e.g., "ws://localhost:8080/kadi")
    - NETWORKS (array, e.g., ["eval"])
    - MODE (e.g., "native")
  - model
    - EVAL_MODEL: model id used for evaluation (example: "claude-sonnet-4-20250514")
    - MAX_TOKENS: token limit for model calls (example: 4096)

- package.json / dependencies
  - @kadi.build/core, agents-library, tsx (runtime)
  - typescript, @types/node (dev)

Environment and runtime configuration
- Runtime configuration is primarily provided via config.toml in the project root.
- agent.json controls the run/build scripts and ability declarations.
- If your deployment also relies on environment variables, set them in your environment or via whatever secrets/config system you use; this project no longer lists dotenv as a dependency in package.json.

File paths referenced in this project
- agent.json (project root) — Kadi ability descriptor
- index.ts (project root) — TypeScript source entrypoint used in development
- dist/index.js (project root) — compiled runtime entrypoint used by `npm run start`
- config.toml (project root) — runtime configuration (broker, model, etc.)
- node_modules/ — installed dependencies
- package-lock.json / agent-lock.json — lockfiles
- abilities/ — resolved abilities (installed by kadi install)

Architecture
------------
ability-eval is organized around a small set of runtime components and a simple data flow tailored for evaluation tasks.

Key components
- Source entrypoint (index.ts)
  - TypeScript source that initializes the runtime, registers handlers and implements evaluation logic. For production runs it is compiled to dist/index.js via npm run build.
- Runtime entrypoint (dist/index.js)
  - The compiled artifact executed by `node dist/index.js` for production-style runs.
- Ability registry (agent.json -> abilities)
  - Declares dependent abilities (secret-ability) that are resolved/loaded by the Kadi runtime or package manager before runtime.
- Kadi runtime (@kadi.build/core)
  - Provides lifecycle, message routing, and inter-agent communication primitives.
- agents-library
  - Project dependency providing utility helpers used by the evaluation logic.
- Evaluation engine / handlers
  - The logic consumes inputs (code diffs, test results, logs, traces), performs analysis using internal heuristics and helpers from secret-ability and agents-library, and emits evaluation results to the configured sink (stdout in stdio mode or a Kadi broker in broker mode).
- Configuration loader (config.toml)
  - Loads runtime configuration for broker connectivity and model selection.

Data flow
1. On start, the compiled runtime (dist/index.js) initializes configuration from config.toml and agent.json, bootstraps the @kadi.build/core runtime, and connects to the broker if configured.
2. Input events arrive via Kadi messages or stdio (depending on mode).
3. The evaluation handlers parse inputs (diffs, test output, logs, traces), enrich or transform them, and invoke analysis routines (may call into secret-ability and agents-library).
4. Results are emitted as structured evaluation messages to either the Kadi broker or written to stdout for downstream consumers.

Development
-----------
Local development is TypeScript-first with immediate execution via tsx or build+run for testing production behavior.

Common tasks
- Preflight (check node):
```bash
npm run preflight
```

- Install dependencies and build:
```bash
npm run setup   # runs `npm install && npm run build`
# or
npm install
npm run build   # runs `npx tsc`
```

- Start (production/runtime):
```bash
npm run start   # runs `node dist/index.js`
```

- Development (run TypeScript source directly):
```bash
npm run dev     # runs `npx tsx index.ts`
```

- Run in stdio or broker mode (dev):
```bash
npm run serve
npm run serve:broker
```

- Clean local artifacts:
```bash
npm run clean
```

Working with abilities
- To add or update an ability, edit agent.json -> abilities and run:
```bash
npm install
kadi install
```
- Confirm that the required ability (e.g., secret-ability) is resolvable in your Kadi environment or in npm.

Type checking
- Run TypeScript checks (using the project's dev dependencies):
```bash
npx tsc --noEmit
```

Notes and tips
- index.ts is the source entrypoint; build to produce dist/index.js for runtime execution.
- Configuration is primarily handled via config.toml (broker + model). Keep secrets and credentials out of source control and manage them with your deployment's secret store.
- The package relies on secret-ability being present — ensure the runtime environment can resolve that dependency (via kadi install or npm).

License and publishing
- This README omits license and publishing instructions. Add a LICENSE file and update agent.json/package.json if you plan to publish the ability to a registry.

If you need sample index.ts scaffolding, tests, or help wiring secret-ability and agents-library into handlers, I can generate an example implementation to match this README.

## Quick Start

```bash
cd ability-eval
npm install
npm run build
npm run start
```

## Tools

(see Tools table above)

## Configuration

### agent.json

| Field | Value |
|-------|-------|
| **Version** | 0.1.2 |
| **Type** | ability |
| **Entrypoint** | `dist/index.js` |

### Abilities

- `secret-ability` *

## Architecture

(see Architecture section above)