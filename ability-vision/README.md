# ability-vision
> Vision analysis ability - image understanding via multimodal LLMs (Claude, GPT-4V)

Overview
--------
ability-vision is a kadi-ability that provides vision analysis and image understanding via multimodal large language models. It exposes a Kadi-compatible entrypoint (dist/index.js compiled from index.ts) and integrates with the Kadi orchestration runtime to accept image inputs, run model-based analysis, and return structured interpretations.

Quick Start
-----------
1. Install runtime dependencies:
- `npm install`

2. Install Kadi (CLI / runtime) and ability registry (if you use a global kadi CLI):
- `npm i -g @kadi.build/cli` (optional, if you don't already have the kadi CLI)
- `kadi install`

3. Build and start the ability locally:
- `npm run setup` (runs `npm install && npm run build`)
- `npm run start` (runs `node dist/index.js`)

Alternative direct start / development:
- `npm run dev` (runs `npx tsx index.ts` for iterative development)
- `npm run serve` (runs `npx tsx index.ts stdio`)
- `npm run serve:broker` (runs `npx tsx index.ts broker`)

Tools
-----
| Tool | Description |
|------|-------------|
| Claude (multimodal) | Primary multimodal model configured via config.toml (VISION_MODEL). Secrets should be placed in secrets.toml or your secret vault. |
| secret-ability | Declared ability dependency from agent.json (`"secret-ability": "*"`) — consumed at runtime by this package. |
| @kadi.build/core | Kadi core runtime package used to register ability handlers and communicate with the Kadi broker. |
| tsx | Lightweight TypeScript runtime used for development and to run index.ts when using `dev`/`serve`. |
| TypeScript | Project is compiled to dist/ via `npx tsc` (build step is required for `npm run start`). |

Configuration
-------------
Key project files:
- `agent.json` — package metadata and declared ability dependencies (present in repo root).
- `index.ts` — TypeScript source entrypoint (compiled to `dist/index.js`).
- `dist/index.js` — compiled runtime entrypoint referenced by `agent.json`.
- `config.toml` — runtime configuration (broker URL, model settings).
- `secrets.toml` — encrypted vault for secrets (do not check into source control).

Relevant fields in agent.json (notable entries):
- `name` — "ability-vision"
- `type` — "ability"
- `version` — "0.1.0"
- `entrypoint` — `"dist/index.js"` (compiled output executed by the ability process)
- `scripts` — includes `preflight`, `setup`, `build`, `start`, `dev`, `serve`, `serve:broker`, `clean`
- `abilities` — ability-level dependencies, e.g. `"secret-ability": "*"`

Configuration files
- config.toml (example taken from repo):
  ```
  [broker.local]
  URL = "ws://localhost:8080/kadi"
  NETWORKS = ["vision"]
  MODE = "native"

  [model]
  MANAGER_BASE_URL = ""
  VISION_MODEL = "claude-sonnet-4-20250514"
  MAX_TOKENS = 4096
  ```
- secrets.toml — put API keys and other secrets here (encrypted vault expected in production).

Notes on env vars and secrets
- This project uses config.toml for broker and model configuration and expects secrets to be stored in secrets.toml (or a secure secret store). The previous .env/dotenv pattern is not required by the repository layout provided here; follow your deployment's secret management conventions.

Runtime modes and scripts (from agent.json):
- `npm run setup` — installs deps and runs `npm run build`
- `npm run build` — compiles TypeScript to `dist/` (`npx tsc`)
- `npm run start` — runs `node dist/index.js` (production / compiled runtime)
- `npm run dev` — runs `npx tsx index.ts` (development mode)
- `npm run serve` — runs `npx tsx index.ts stdio` (stdio transport for testing)
- `npm run serve:broker` — runs `npx tsx index.ts broker` (connect to broker per config.toml)
- `npm run preflight` — prints Node version (`node --version`)
- `npm run clean` — removes node_modules, abilities, agent-lock.json, package-lock.json and `dist`

Architecture
------------
Data flow
1. Input (image + optional prompt or metadata) arrives via one of the transports:
   - stdio transport (`serve`) for local testing
   - broker transport (`serve:broker`) via Kadi broker (configured in `config.toml`)
   - direct invocation when used as a nested ability

2. Preprocessing
   - Image is validated and normalized (format checking, resizing or base64 handling).
   - Optional metadata (prompt, boxes, language) is parsed.

3. Model invocation
   - The ability selects a multimodal LLM client based on configuration (e.g., the VISION_MODEL defined in `config.toml`).
   - Image and prompt are forwarded to the model client in the expected API format.
   - Authentication and secrets are expected to be resolved from `secrets.toml` or your secret manager.

4. Postprocessing
   - Raw model output is parsed into structured response objects (labels, bounding boxes, captions, confidence scores).
   - Optional enrichment via the `secret-ability` dependency may be applied for specialized reasoning.

5. Response
   - The structured result is returned to the caller over the same transport (stdio, broker, or direct SDK call).

Key components
- `index.ts` — TypeScript source entrypoint that registers ability handlers with @kadi.build/core and wires transports.
- `dist/index.js` — compiled runtime entrypoint executed in production (`node dist/index.js`).
- `config.toml` / `secrets.toml` — configuration and secrets.
- Model client adapters — encapsulate model API calls according to configured VISION_MODEL.

Development
-----------
Local setup
1. Install deps and build:
- `npm run setup` (runs `npm install && npm run build`)

2. Validate Node.js:
- `npm run preflight` will print Node version.

Running locally
- `npm run dev` — runs `npx tsx index.ts` (development/interactive)
- `npm run start` — runs `node dist/index.js` (compiled runtime; ensure `npm run build` has been run)
- `npm run serve` — runs `npx tsx index.ts stdio` (stdio transport for testing)
- `npm run serve:broker` — runs `npx tsx index.ts broker` (connects to broker at URL configured in `config.toml`)

Kadi CLI
- If using the Kadi orchestration ecosystem, install and use the kadi CLI:
  - `npm i -g @kadi.build/cli` (optional)
  - `kadi install` — install/resolve ability dependencies and registry metadata
  - `kadi run start` — run the ability under the Kadi runner

Testing and debugging
- Use the stdio mode (`npm run serve`) to exercise the ability with local test harnesses that write requests to stdin and read responses from stdout.
- Enable verbose logs per your environment or runtime configuration; logging configuration is implementation-specific.

Cleaning and housekeeping
- `npm run clean` — removes build artifacts and node_modules; also removes `dist` and lock files as configured.
- Keep `agent.json` and `config.toml` updated with versions and runtime configuration.

Notes and best practices
- Keep your secrets out of source control; use `secrets.toml` and an encrypted vault for production.
- Validate image sizes and formats before sending binary payloads to model APIs to control cost and latency.
- Use the `abilities` block in `agent.json` to declare and pin other kadi abilities this package relies on (e.g., `secret-ability`).

## Quick Start

```bash
cd ability-vision
npm install
npm run setup
kadi install
kadi run start
```

## Tools

- See the Tools table above — primary runtime is compiled Node (`dist/index.js`) with development assistance from `tsx` and build tooling via TypeScript. Model configuration is managed in `config.toml`.

## Architecture

- See the Architecture section above for data flow and key components.

## Development

```bash
npm install
npm run setup
kadi run start
```

---