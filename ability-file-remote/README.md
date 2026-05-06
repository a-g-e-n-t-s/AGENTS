# ability-file-remote
> Remote file sharing - tunneling and temporary URL management

Overview
--------
ability-file-remote is a Kadi ability that provides remote file sharing by creating ephemeral tunnels (ngrok or localtunnel) and generating temporary URLs for files. It is designed to run as part of the AGENTS / Kadi multi-agent orchestration platform. The package exposes a small runtime (entrypoint: dist/index.js when built) that can operate in stdio or broker mode and includes utilities for storing files temporarily and issuing time-limited access URLs.

Quick Start
-----------
1. Clone the repository and change into the package directory.
2. Install Node dependencies and build:
   npm run setup
   (runs `npm install && npm run build`)
3. Install Kadi / ability dependencies (from the Kadi orchestration environment):
   kadi install
4. Start the ability under Kadi (or run locally after build):
   kadi run start

Common local commands:
- Run the built ability (production):
  npm run start
  (this runs `node dist/index.js` as defined in agent.json)
- Run the ability directly in development (no build):
  npm run dev
  (this runs `npx tsx index.ts`)
- Run in stdio mode:
  npm run serve
  (this runs `npx tsx index.ts stdio`)
- Run as broker (message broker mode):
  npm run serve:broker
  (this runs `npx tsx index.ts broker`)
- Clean local build artifacts and install state:
  npm run clean

Tools
-----
| Tool | Description |
|------|-------------|
| ngrok | Public tunnel provider used to expose a local port to the internet. Requires NGROK_AUTH_TOKEN for authenticated tunnels. |
| localtunnel | Lightweight tunneling provider (localtunnel.me) as an alternative to ngrok; supports requesting a subdomain. |
| @kadi.build/core | Kadi core library used to integrate this ability with the AGENTS orchestration platform. |
| fs-extra | Filesystem utilities used to read/write and manage temporary file storage. |
| chalk | Colored terminal output used for status/debug logs. |
| debug | Structured debug logging used by the runtime. |

Configuration
-------------
Configuration can be provided via environment variables (recommended) or by editing configuration files consumed by the runtime. Kadi will inject environment variables in production. For local development you may use a .env file with your preferred loader — the repository does not bundle dotenv as a dependency.

Standard environment variables
- REMOTE_PROVIDER
  - Description: Which tunnel provider to use.
  - Allowed values: ngrok, localtunnel
  - Default: ngrok
- NGROK_AUTH_TOKEN
  - Description: ngrok authentication token for creating stable or reserved tunnels.
  - Example: NGROK_AUTH_TOKEN=2AbCDeFGhIJkLmnoPqRsT
- LT_SUBDOMAIN
  - Description: Requested subdomain when using localtunnel. Optional.
  - Example: LT_SUBDOMAIN=my-ability-subdomain
- PORT
  - Description: Local port to expose over the tunnel.
  - Default: 3000
- FILE_STORAGE_PATH
  - Description: Local directory where temporary files are stored.
  - Default: ./tmp/files
- URL_TTL_SECONDS
  - Description: Time-to-live for generated temporary URLs (in seconds).
  - Default: 3600 (1 hour)
- LOG_LEVEL
  - Description: Controls logging verbosity for the ability (e.g., debug, info, warn, error).
  - Default: info

Example .env
ENV file example (create a .env file at repo root):
REMOTE_PROVIDER=ngrok
NGROK_AUTH_TOKEN=your-ngrok-token-here
PORT=3000
FILE_STORAGE_PATH=./tmp/files
URL_TTL_SECONDS=3600
LOG_LEVEL=debug

agent.json
----------
| Field | Value |
|-------|-------|
| **Version** | 0.1.1 |
| **Type** | ability |
| **Entrypoint** | `dist/index.js` |

Additional configuration file: config.toml
- Located at the repository root and used by Kadi in some deployments.
- Relevant sections:
  - [broker.local]
    - URL (e.g., "ws://localhost:8080/kadi")
    - NETWORKS (e.g., ["file"])
    - MODE (e.g., "native")
  - [tunnel]
    - SERVICE — preferred tunnel service (the project configuration uses "kadi" by default)
    - FALLBACK_SERVICES — array of fallback services (e.g., ["ssh", "frpc"])
    - AUTO_FALLBACK — boolean to enable automatic fallback to alternatives

File paths and important files
- dist/index.js — built entrypoint (runtime launcher) as defined in agent.json.
- index.ts — source entrypoint used during development.
- abilities/ — directory where individual ability modules should live.
- agent-lock.json — Kadi lock file (used/created by orchestration).
- package-lock.json — npm lockfile.
- tmp/files/ — default runtime storage (configurable via FILE_STORAGE_PATH).

Architecture
------------
This section describes the main runtime components and the data flow for creating temporary file URLs.

Key components
- Runtime / Entrypoint (index.ts / dist/index.js)
  - Boots the ability, reads configuration (.env, config.toml and env vars), sets up logging, and registers the ability with the Kadi runtime or runs in stand-alone mode.
- Tunnel Provider Adapter
  - Abstraction over tunneling providers. Supported adapters:
    - ngrok adapter — uses the ngrok package and NGROK_AUTH_TOKEN to create a tunnel that maps a public URL to the local PORT.
    - localtunnel adapter — uses the localtunnel package and supports subdomain requests via LT_SUBDOMAIN.
    - Additional fallback mechanisms can be configured via config.toml (e.g., ssh, frpc).
- File Storage Manager
  - Uses fs-extra to persist uploaded files to FILE_STORAGE_PATH and performs cleanup of expired files.
- URL Manager / Tokenizer
  - Generates ephemeral URLs and tokens with TTL set by URL_TTL_SECONDS. Maps tokens to local file paths and validates TTL on access.
- HTTP Server / Request Router
  - Listens on PORT and handles:
    - File upload endpoints
    - Temporary URL generation endpoints
    - Redirects or proxying to local file storage for public access
- Kadi Integration Layer (@kadi.build/core)
  - Handles ability registration, messaging, and lifecycle when run under the AGENTS platform (registers handlers, responds to messages, and exposes actions).

Data flow
1. Initialization: entrypoint loads configuration and chooses a tunnel provider adapter (ngrok or localtunnel). config.toml can influence broker and tunnel fallback behavior.
2. Tunnel creation: the adapter opens a public tunnel pointing to the local PORT. The public URL is returned and recorded by the ability.
3. File upload: a client uploads a file to the HTTP server (POST /upload). The File Storage Manager saves the file under FILE_STORAGE_PATH and generates a file id.
4. URL issuance: client requests a temporary URL (POST /url) for a stored file. The URL Manager creates a time-limited token and a public path under the tunnel URL (e.g., https://<tunnel-host>/file/<token>).
5. Access: external clients access the public URL created by the tunnel. The request is routed to the HTTP server, which validates the token, serves the file if valid, or returns an error if expired/invalid.
6. Cleanup: background job removes files and tokens past their TTL.

Development
-----------
Repository scripts (from agent.json)
- preflight: node --version
- setup: npm install && npm run build
- build: npx tsc
- start: node dist/index.js
- dev: npx tsx index.ts
- serve: npx tsx index.ts stdio
- serve:broker: npx tsx index.ts broker
- clean: rm -rf node_modules abilities agent-lock.json package-lock.json dist

Local development steps
1. Install dependencies and build:
   npm run setup
2. Create .env (see Configuration), set REMOTE_PROVIDER, NGROK_AUTH_TOKEN or LT_SUBDOMAIN as needed.
3. Start the ability locally:
   - For a built run: npm run start
   - For development without building: npm run dev
   - For stdio mode: npm run serve
   - For broker mode: npm run serve:broker
4. Interact with the HTTP endpoints on PORT (default 3000) or via the public tunnel URL produced by the provider.

Testing and debugging
- Use LOG_LEVEL=debug in .env to enable verbose logs.
- The package uses the debug package — set DEBUG=* to see debug outputs.
- For ngrok, validate your NGROK_AUTH_TOKEN and review the ngrok console/dashboard for connection details.

Extending the ability
- Add new handlers under abilities/ and export them so the entrypoint can register them with the runtime.
- Implement additional tunnel adapters by following the existing adapter interface: startTunnel(config) => { publicUrl, close() }.
- Ensure any new files are persisted under FILE_STORAGE_PATH and that the URL Manager is updated to honor URL_TTL_SECONDS.

Notes and constraints
- The ability intends to create temporary public URLs. Do not expose sensitive files unless appropriate authentication and access controls are added.
- ngrok and localtunnel have provider-specific limits; use NGROK_AUTH_TOKEN for stable/reserved tunnels when required.

License and support
- See the repository root for license and contribution guidelines.
- For issues related to Kadi integration, consult the Kadi documentation and the @kadi.build/core package.

---