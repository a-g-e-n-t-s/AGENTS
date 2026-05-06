# ability-file-cloud
> Cloud file operations for Dropbox, Google Drive, and Box

Overview
This kadi-ability implements cloud file operations (upload, download, list, delete) across Dropbox, Google Drive, and Box. It is intended to be run as a KADI ability (agent) with a compiled entrypoint (dist/index.js) and integrates with the KADI core runtime.

Quick Start
1. Build and install dependencies:
   npm run setup

2. Register/install with KADI (run from the repository root where agent.json is present):
   kadi install

3. Start the ability using KADI:
   kadi run start

You can also run locally using the npm scripts defined in agent.json:
- Perform preflight check:
  npm run preflight
- Install dependencies and build:
  npm run setup
- Build only:
  npm run build
- Start in production (runs compiled dist/index.js):
  npm run start
- Start in development (run TypeScript entrypoint via tsx):
  npm run dev
- Start in stdio mode (development):
  npm run serve
- Start in broker mode (development):
  npm run serve:broker
- Clean local artifacts:
  npm run clean

Tools
| Tool | Description |
| --- | --- |
| dropbox | Connector for Dropbox: upload, download, list, delete files in a Dropbox account using an access token. |
| google-drive | Connector for Google Drive: upload, download, list, delete files using OAuth2 client/refresh token flow. |
| box | Connector for Box: upload, download, list, delete files for Box accounts using Box credentials or developer token. |

Configuration
Files and entrypoints
- agent.json — agent manifest (present in the package root). Key fields (updated):
  - "entrypoint": "dist/index.js" — production entrypoint is the compiled JS in dist/
  - "version": "0.2.0"
  - "type": "ability"
  - "abilities": includes "secret-ability": "*" in this repository's manifest (abilities declared here are exposed by the agent)
  - "brokers": includes "remote": "wss://broker.dadavidtseng.com/kadi" (broker endpoints can be declared here)
  - See agent.json for scripts and other metadata.
- index.ts — TypeScript source entrypoint used for development (tsx). The project is built to dist/ via npm run build (npx tsc).
- dist/ — compiled output (contains dist/index.js) produced by the build step.
- abilities/ — (convention) directory to place provider/ability modules and connectors (create if adding new connectors).
- config.toml — ability configuration (broker/local settings). This repository includes a [broker.local] section with:
  - URL = "wss://broker.dadavidtseng.com/kadi"
  - NETWORKS = ["file"]
  - MODE = "broker"
  See config.toml in the repo root.
- secrets.toml — recommended location for encrypted secrets (use project secret vault workflow); secrets go in secrets.toml rather than committing plaintext files.

Environment variables and secrets
Provider credentials and runtime options may be provided either via environment variables at runtime or via the repository configuration/secrets (config.toml + secrets.toml). Note: dotenv is not shipped as a runtime dependency; prefer providing secrets through your environment or an encrypted secrets store.

Common environment variables this ability expects (if using env-based configuration):

- Dropbox
  - DROPBOX_ACCESS_TOKEN — OAuth2 access token for Dropbox API
  - DROPBOX_APP_KEY — (optional) Dropbox app key for app-based operations

- Google Drive
  - GOOGLE_CLIENT_ID — OAuth2 client ID
  - GOOGLE_CLIENT_SECRET — OAuth2 client secret
  - GOOGLE_REFRESH_TOKEN — OAuth2 refresh token used to fetch access tokens
  - GOOGLE_API_KEY — (optional) API key for Drive-specific endpoints

- Box
  - BOX_CLIENT_ID — Box application client ID
  - BOX_CLIENT_SECRET — Box application client secret
  - BOX_DEVELOPER_TOKEN — (optional) short-lived developer token for quick testing

- KADI / runtime
  - KADI_ENV — (optional) runtime environment name
  - LOG_LEVEL — (optional) set logging verbosity (info, debug, warn, error)

Make sure to keep secrets out of source control. The project includes config.toml for configuration and expects secrets to be stored in secrets.toml or provided via the environment.

Architecture
High-level components and data flow:
- index.ts (development entrypoint) / dist/index.js (production entrypoint)
  - Loads configuration (config.toml + secrets.toml or env)
  - Initializes KADI ability bindings via @kadi.build/core
  - Registers provider connectors (Dropbox, Google Drive, Box) as tools/handlers

- Provider connector modules (convention: abilities/<provider>.ts or src/providers/<provider>.ts)
  - Implement a normalized capability interface for operations:
    - uploadFile({ path, stream|buffer, metadata })
    - downloadFile({ id|path })
    - listFiles({ path, query })
    - deleteFile({ id|path })
  - Handle provider-specific authentication and token refresh logic.
  - Use node-fetch and form-data for HTTP interactions.

- KADI core
  - Routes incoming tasks/requests from various transports (stdio, broker) into the registered tool handlers.

Data flow example (upload):
1. A KADI client sends an "ability.file.upload" request to the ability via stdio or broker.
2. KADI core receives the request and invokes the registered provider tool (e.g., dropbox.uploadFile).
3. The provider module ensures valid credentials, makes an HTTP multipart/form-data POST to the provider API using node-fetch/form-data.
4. Provider returns a normalized response (file id, path, size, metadata) to the KADI core.
5. KADI core returns the response to the client.

Runtime modes
- stdio mode (npm run serve): ability reads/writes messages on stdin/stdout for direct piping to a KADI conductor or child process setup (development).
- broker mode (npm run serve:broker): ability connects to the broker configured in config.toml (by default this repo's config points at wss://broker.dadavidtseng.com/kadi) and processes messages via that broker.
- production start (npm run start): runs the compiled dist/index.js (ensure you ran npm run build or npm run setup first).

Development
Prerequisites
- Node.js (check with npm run preflight)
- kadi CLI available in PATH to run kadi install and kadi run start
- TypeScript installed as a dev dependency (npx tsc used for build)
- tsx used for running the TypeScript entrypoint in development (tsx is listed as a dependency in this project)

Local development workflow
1. Install dependencies and build:
   npm run setup

2. Create config.toml and secrets.toml at the repository root with the required configuration and credentials (see config.toml example). Alternatively provide credentials via environment variables.

3. Start the agent locally in development:
   npm run dev
   or
   npm run serve

4. To run compiled production code locally:
   npm run build
   npm run start

5. To iterate on provider connectors:
   - Add connector modules under abilities/ or src/providers/
   - Export/register them in index.ts so KADI core can discover and route requests to them
   - Use npm run dev to run TypeScript entrypoint without a full install/build step (index.ts runs via tsx)

Adding a new provider
1. Create a new file at abilities/<provider>.ts implementing uploadFile, downloadFile, listFiles, deleteFile.
2. Add environment variable keys to your README/config and document them in Configuration.
3. Register the tool in index.ts with a name that matches the tools table entry (for example "onedrive" if adding OneDrive).
4. Update README Tools table and tests as needed.

Testing and debugging
- Use LOG_LEVEL=debug to increase runtime logging.
- For one-off API testing, populate the provider developer token (e.g., BOX_DEVELOPER_TOKEN) and call the connector methods via an ad-hoc script.
- Use npm run clean to remove node_modules, dist and lock files when resetting local state.

Dependencies (from package.json/agent.json)
- @kadi.build/core — core KADI integration
- form-data — for multipart uploads
- node-fetch — HTTP client (v2.x)
- tsx — run TypeScript files directly in Node.js (this project lists tsx in dependencies)
Dev dependencies:
- typescript — compile to dist/
- @types/node — type definitions

Files of interest
- agent.json — agent manifest (entrypoint, scripts, metadata). Updated entrypoint: dist/index.js. This repository's agent.json also declares an abilities entry ("secret-ability": "*") and a remote broker URL ("wss://broker.dadavidtseng.com/kadi").
- config.toml — runtime configuration (broker settings). See the included [broker.local] section for URL, NETWORKS and MODE.
- secrets.toml — encrypted secrets vault (recommended)
- index.ts — TypeScript ability entrypoint (used in development)
- dist/index.js — compiled production entrypoint (generated by npm run build)
- abilities/ — connector modules (convention for adding providers)

Support and contribution
- Follow the Development section to add connectors or modify behavior.
- Keep secrets out of source control (use secrets.toml or environment variables).
- When contributing: document new environment variables and update the Tools table and Configuration sections.

License
- This repository does not include a license file by default. Add LICENSE at the repository root if you intend to open-source.

## agent.json (summary)

| Field | Value |
|-------|-------|
| **Version** | 0.2.0 |
| **Type** | ability |
| **Entrypoint** | `dist/index.js` |
| **Abilities** | `{"secret-ability": "*"}` |
| **Brokers** | `{"remote":"wss://broker.dadavidtseng.com/kadi"}`

---


---