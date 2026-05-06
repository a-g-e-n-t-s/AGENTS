# ability-docs-memory
> Documentation search engine built on graph-ability — crawls, chunks, indexes, and searches documentation with 4-signal hybrid recall including structural navigation

Overview
--------
ability-docs-memory is a Kadi/AGENTS ability that crawls, chunks, indexes, and searches documentation using a graph-backed DocNode model and a 4-signal hybrid recall (semantic, keyword, graph, structural). It ships tools for indexing, searching, and inspecting documentation stored in the graph database. The ability is implemented to run as a native in-process library, as a remote ability via a Kadi broker, or as a CLI service.

Quick Start
-----------
1. Install package dependencies:
`npm install`

2. Install the ability into your Kadi environment (local path or package registry):
`kadi install .`

3. Start the ability (serves the tools to the broker):
`kadi run start`

Alternative local run methods:
- Use the packaged start/setup scripts (defined in agent.json):
`npm run setup`  (runs `npm install && npm run build`)  
`npm start`      (runs `node dist/index.js broker`)

- Run TypeScript source directly for development (requires `tsx`):
`npm run dev`    (runs `npx tsx src/index.ts`)  
or
`npx tsx src/index.ts`

Tools
-----
| Tool | Description |
|------|-------------|
| docs-search | Search documentation using 4-signal hybrid recall (semantic, keyword, graph, structural). |
| docs-reindex | Reindex documentation into the graph database — full pipeline: crawl → chunk (by markdown headings) → batch-store. |
| docs-page | Fetch a single documentation page by slug. Returns all chunks (DocNode vertices) for that page. |
| docs-index-status | Get documentation index statistics: total DocNodes, counts by collection, health and last indexed time. |

Configuration
-------------
Primary configuration sources and fields:

- agent.json (package root)
  - `name` (string) — ability name, read by the ability client (example: `"ability-docs-memory"`).
  - `version` (string) — ability version (current: 0.0.3).
  - `entrypoint` (string) — runtime entry file (`dist/index.js`).
  - `abilities` (object) — declared dependent abilities (e.g. `"ability-graph": "^0.1.2"`, `"secret-ability": "^0.9.4"`).
  - `brokers` (object) — broker definitions (example in repo: `"remote": "wss://broker.dadavidtseng.com/kadi"`).
  - `scripts.setup`, `scripts.build`, `scripts.start`, `scripts.dev`, etc. (`setup` runs install+build, `build` runs `npx tsc`, `start` runs packaged entrypoint).

- config.toml (optional config file shipped in repo)
  - [docs] section — docs-related configuration fields:
    - `database` — default database (example: `agents_memory`)
    - `default_collection` — default collection (example: `agents-docs`)
    - `embedding_model` — embedding model (example: `text-embedding-3-small`)
    - `extraction_model` — extraction/chat model (example: `gpt-5-nano`)
    - `max_tokens` — token cap for extraction (example: `500`)
    - `base_url` — base URL for local doc server (example: `http://localhost:3333`)
    - `domain` — domain for docs (example: `localhost`)
    - `embedding_transport` — transport for embeddings (`api` or other)
    - `chat_transport` — transport for chat/extraction (`api` or other)
  - [broker.remote] example settings: `URL`, `NETWORKS`, `MODE` (see `config.toml` in repo).

- Environment
  - `BROKER_URL` — If set, overrides broker URL resolution. The runtime checks this env var first when connecting the internal `KadiClient`.

- Broker resolution behavior (implemented in `src/index.ts`):
  1. If `process.env.BROKER_URL` is set, it is used.
  2. Otherwise `agent.json` is searched for `defaultBroker` or the first key in `agent.json.brokers`.
  3. If the broker entry is a string it's used as the URL; if an object with `url`/`URL` use that.
  4. If no broker is found, fallback: `ws://localhost:8080/kadi`.

Important file paths referenced by the runtime:
- `agent.json` — package metadata + broker settings (root).
- `config.toml` — ability config file (optional) with docs and broker sections.
- `dist/index.js` — compiled entrypoint (packaged runtime).
- `src/index.ts` — runtime bootstrap and client setup.
- `./lib/config.js` — docs configuration loader (uses Vault integration).
- `./lib/schema.js` — `DOCNODE_SCHEMA` (DocNode vertex schema).
- `./tools/search.js` — `registerSearchTool` implementation.
- `./tools/reindex.js` — `registerReindexTool` implementation.
- `./tools/page.js` — `registerPageTool` implementation.
- `./tools/index-status.js` — `registerIndexStatusTool` implementation.

Architecture
------------
High-level data flow and key components:

- KadiClient
  - The ability constructs a `KadiClient` (from `@kadi.build/core`) using the name/version from `agent.json` and a resolved broker URL. This client is used to load native abilities and to register/invoke tools.

- Config loader (`loadDocsConfigWithVault`)
  - Loads documentation configuration and optionally fetches secrets via `secret-ability` (Vault) to supply credentials or protected settings. See `./lib/config.js` and the repo `config.toml` example.

- Graph ability (`ability-graph`)
  - The ability attempts to `client.loadNative('ability-graph')` to access a graph database API for creating vertices, edges, and indexes. If native load fails, the ability continues — tools will run but may operate remotely via broker-invoked graph services.

- Crawler & Chunker (docs-reindex)
  - docs-reindex implements the full pipeline: crawl documentation pages, chunk each page by markdown headings (creating smaller semantic units), and produce DocNode vertices for each chunk.

- Batch store (graph-batch-store)
  - Chunked DocNodes are written to the graph database in batches. The runtime marks `graph-batch-store` as a long-running tool (see `LONG_RUNNING_TOOLS` set), which affects lifecycle handling for long-running batch operations.

- DocNode model and DOCNODE_SCHEMA
  - DocNodes represent document chunks (title, slug, content, headings, metadata). The schema is defined in `./lib/schema.js` and is the persistent vertex model stored in the graph (database `agents_memory`, default collection `agents-docs`).

- Indexing & Signals
  - Each DocNode is indexed across multiple signals:
    - Semantic vectors (embedding-based similarity)
    - Keyword indexes (token/term indexes)
    - Graph signals (edges: NEXT_SECTION, REFERENCES)
    - Structural navigation signals (section relationships to enable "next section" traversal)
  - The search tool (`docs-search`) integrates these 4 signals to produce hybrid recall results with structural navigation support (e.g., navigate to `NEXT_SECTION` and follow `REFERENCES`).

- Tools
  - Tools are registered from `./tools/*.js` and exposed via the Kadi broker for remote invocation or invoked directly when loaded as a native library. See `src/index.ts` for registration calls:
    - `registerSearchTool` (./tools/search.js)
    - `registerReindexTool` (./tools/reindex.js)
    - `registerPageTool` (./tools/page.js)
    - `registerIndexStatusTool` (./tools/index-status.js)

Key runtime behaviors:
- The ability will try to load `ability-graph` natively. If that fails it continues but logs a warning and may rely on broker-based access to graph services.
- The `LONG_RUNNING_TOOLS` set includes `'graph-batch-store'` so the runtime treats that tool as long-lived and keeps it available for asynchronous batch indexing jobs.

Development
-----------
Local development tips and commands:
- Install dependencies:
`npm install`

- Set up (agent.json provides a `setup` script which runs install+build):
`npm run setup`

- Build:
`npm run build`  (runs `npx tsc`)

- Run packaged ability:
`npm start`  (runs `node dist/index.js broker` per `agent.json`)

- Run from source for rapid iteration:
`npm run dev`  (runs `npx tsx src/index.ts`)  
or
`npx tsx src/index.ts`

- Useful environment variables:
  - `BROKER_URL` — force a broker URL to use (overrides agent.json broker resolution).
  - `NODE_ENV` — runtime environment.

- Registering and testing tools:
  - Tools are registered in `src/index.ts` via calls to the register functions listed above.
  - Use `client.invoke('docs-search', { ... })` or the Kadi CLI to call tools remotely.

Notes
-----
- The package declares runtime dependencies in the source agent metadata: it relies on `ability-graph` and `secret-ability`.
- Schema for DocNode is located at `./lib/schema.js` (export `DOCNODE_SCHEMA`).
- See `src/index.ts` for broker resolution logic, client creation, and ability/tool registration sequence.

If you need examples of payloads for `docs-search`, `docs-reindex`, or other tools, or a sample docs config file (`config.toml`/`docs.yml`/`docs.json`) tuned for your documentation site, tell me which target documentation source and I will provide an example config and example tool invocation.

## Quick Start

```bash
cd ability-docs-memory
npm install
kadi install
kadi run start
```

## Tools

- docs-search: Search documentation using 4-signal hybrid recall (semantic, keyword, graph, structural).
- docs-reindex: Reindex documentation into the graph database. Crawls pages, chunks by markdown headings, and batch-stores DocNodes.
- docs-page: Fetch a single documentation page by slug. Returns all chunks of the page.
- docs-index-status: Get documentation index statistics: total DocNodes, counts by collection, health and last indexed time.

## Configuration

### agent.json

| Field | Value |
|-------|-------|
| **Version** | 0.0.3 |
| **Type** | ability |
| **Entrypoint** | `dist/index.js` |

### Abilities

- `ability-graph` ^0.1.2
- `secret-ability` ^0.9.4

### Brokers

- **remote**: `wss://broker.dadavidtseng.com/kadi`

## Architecture

See "Architecture" section above and `src/index.ts` for implementation details and the registration of the tools.

## Development

```bash
npm install
npm run build
kadi run start
```

---