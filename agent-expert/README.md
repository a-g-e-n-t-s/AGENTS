# agent-expert

> AGENTS developer assistant — answers questions, writes TDDs, provides guides

## Quick Start

Recommended (production build)
```bash
npm install
npm run build
npm start
```

Development (iterative)
```bash
npm install
# run TypeScript source directly with hot reload
npm run dev
```

Notes:
- The build image (agent.json.build.default.run) runs `kadi install kadi-secret` and `kadi install` as part of the build. You may still need to run `kadi install` locally to install native abilities.
- The HTTP chat UI starts on port 3500 by default when running locally (set PORT to change).
- The broker URL can be overridden with the BROKER_URL environment variable.

## Tools

| Tool | Description |
|------|-------------|
| *(Run the server and check the broker for registered tools; this agent registers tools such as ask-agents, write-tdd, etc. The server also exposes a simple HTTP chat UI on port 3500.)* | |

## Configuration

### agent.json

| Field | Value |
|-------|-------|
| **Version** | 0.1.0 |
| **Type** | agent |
| **Entrypoint** | `dist/index.js` |

### Abilities

- `secret-ability` (*)
- `ability-log` (*)

### Brokers

- **remote**: `wss://broker.dadavidtseng.com/kadi`

### Networks

- `global`

> Runtime selection: the code selects the broker URL from the BROKER_URL environment variable first, then falls back to agent.json.brokers?.local, and finally `ws://localhost:8080/kadi` if none are set.

## Architecture

agent-expert lifecycle (high level):
- Loads agent.json and creates a KadiClient.
- Attempts to load secrets via the `secret-ability` native ability and caches keys for model calls. At runtime the agent tries to load the keys `MM-1_API_KEY` and `MEMORY_API_KEY` from the vaults `model-manager` and `anthropic`, storing any found values in the exported `secretCache`.
- Registers broker tools (see src/tools.ts) — tools like ask-agents and write-tdd are registered when connected to a broker.
- Connects to the broker (if available) and falls back to HTTP-only mode when not connected.
- Starts an HTTP server (chat UI) on port 3500 by default (see src/server.ts).
- Handles graceful shutdown on SIGINT.

Configuration files:
- agent.json — agent metadata, abilities, brokers, scripts and deploy config.
- config.toml — local runtime settings (broker, logging, secrets, arcadedb).

Secrets:
- Vaults configured in config.toml: `model-manager`, `anthropic`, `arcadedb`.
- config.toml also lists expected keys such as `MODEL_MANAGER_API_KEY`, `MODEL_MANAGER_BASE_URL`, `ARCADE_USERNAME`, and `ARCADE_PASSWORD`.
- The agent.json deploy configuration (akash-mainnet) requires the `model-manager` vault to provide `MODEL_MANAGER_API_KEY` and `MODEL_MANAGER_BASE_URL`, and the `arcadedb` vault to provide `ARCADE_USERNAME` and `ARCADE_PASSWORD`. Deploy delivery is configured to use the broker.
- Note: at runtime the process also attempts to read `MM-1_API_KEY` and `MEMORY_API_KEY` (from `model-manager`/`anthropic`) into `secretCache` for model-related calls; if `secret-ability` is not available the agent will warn and model calls may fail.

Deployment note:
- The Akash deploy configuration exposes the app container on port 3000 (container side) while the local HTTP server defaults to 3500.

## Development

Install deps, build, and run:

```bash
npm install
npm run build      # compiles to dist/
npm start          # runs node dist/index.js
```

For iterative development (no build step):

```bash
npm run dev        # runs src/index.ts via tsx
```

Available npm scripts (from agent.json):
- setup: npm run build
- start: node dist/index.js
- dev: npx tsx src/index.ts
- build: npx tsc
- type-check: npx tsc --noEmit
- lint: npx eslint src --ext .ts
- test: npx vitest
- clean: rm -rf node_modules dist abilities agent-lock.json package-lock.json

---

---