# agent-worker
> Generic worker agent for the KĀDI multi-agent system (roles: artist, designer, programmer)

Overview
--------
agent-worker is a KĀDI-compatible worker agent that runs role-specific worker loops (artist, designer, programmer). It is built on top of agents-library and provides registration/heartbeat with an MCP (mcp-server-quest), role configuration loading, provider injection, and a tool-calling loop that listens for task.assigned events and publishes task.completed, task.failed, or task.rejected.

This version uses config.toml for runtime configuration and supports multiple broker endpoints (local and remote). Role configurations are read from TOML files under config/roles/{role}.toml.

Quick Start
-----------
1. Install node deps and KADI runtime:
   - npm install
   - kadi install

2. Build (TypeScript compile) and start:
   - npm run setup
   - kadi run start

3. Run directly (production JS entry):
   - npm run start

4. Run for a specific role (examples):
   - npm run start:artist
   - npm run start:designer
   - npm run start:programmer

Helpful dev commands:
- npm run dev          (live-reload TypeScript with tsx)
- npm run dev:artist   (dev with AGENT_ROLE=artist)
- npm run build        (npx tsc)
- npm run lint         (npx eslint src --ext .ts)
- npm test             (npx vitest)
- npm run preflight    (checks node --version)

Tools
-----
| Tool | Description |
|------|-------------|
| agents-library (createWorkerAgent, loadVaultCredentials, readConfig, setLogLevel, setAgentTag, logger, timer) | Core runtime primitives: BaseAgent (provides KadiClient, ProviderManager, MemoryService), createWorkerAgent (factory to create the worker loop), configuration helpers (readConfig), vault loader (loadVaultCredentials), and logging/timing helpers. Imported from dependency "agents-library". |
| RoleLoader (./roles/RoleLoader.js) | Loads role-specific configuration from config/roles/{role}.toml and applies role settings (capabilities, maxConcurrentTasks, behavior tuning) to the worker agent. |
| KADI Brokers (config.toml / agent.json brokers.local / brokers.remote) | Supports multiple broker endpoints. URLs are configured in config.toml or overridden via environment variables (KADI_BROKER_URL_LOCAL, KADI_BROKER_URL_REMOTE). Network subscriptions can be provided via KADI_NETWORK_LOCAL and KADI_NETWORK_REMOTE. |
| mcp-server-quest RPCs (quest_quest_register_agent, quest_quest_agent_heartbeat, quest_quest_unregister_agent) | Remote procedures invoked to register the agent, send heartbeats, and unregister on shutdown. |
| loadVaultCredentials | Utility to load secrets/vault credentials (used during startup to fetch API keys or agent secrets). Environment variables take precedence over vault values. |
| Abilities (secret-ability, ability-file-local, ability-log) | Declared abilities in agent.json; these are available for injection/usage at runtime. |

Configuration
-------------
Files and locations:
- src/index.ts — main TypeScript entry
- dist/index.js — built entrypoint (npm run setup or npm run build produces this)
- roles/RoleLoader.js — role loader
- config.toml — primary runtime config (agent identity, brokers, providers, memory, secrets)
- config/roles/{role}.toml — per-role configuration files (artist, designer, programmer)
- agent.json — agent manifest (name, version, entrypoint, scripts, brokers, abilities)

Key agent.json fields (updated)
- name: agent-worker
- type: agent
- version: 0.3.3
- entrypoint: dist/index.js
- scripts: preflight (node --version), setup (npm run build), start (node dist/index.js), dev (npx tsx watch src/index.ts), etc.
- abilities: secret-ability, ability-file-local, ability-log
- brokers: local and remote endpoints defined (see agent.json)

Key configuration fields and environment variables:
- config.toml [agent section]
  - agent.ID, agent.ROLE, agent.VERSION — identity and default role
- Broker resolution:
  - Primary broker can be configured under [broker.local] or [broker.remote] in config.toml.
  - Environment overrides:
    - KADI_BROKER_URL_LOCAL — override broker.local.URL
    - KADI_BROKER_URL_REMOTE — override broker.remote.URL
    - KADI_NETWORK_LOCAL — comma-separated networks for the local broker
    - KADI_NETWORK_REMOTE — comma-separated networks for the remote broker
- Role selection:
  - AGENT_ROLE (env) controls which role config to load (artist, designer, programmer).
  - Example: AGENT_ROLE=artist npm run start OR npm run start:artist
- Provider and vault credentials:
  - loadVaultCredentials reads configured vaults (see config.toml [secrets]) and values; process.env values take precedence.
  - Common/vault keys referenced: ANTHROPIC_API_KEY, MODEL_MANAGER_API_KEY, MODEL_MANAGER_BASE_URL, ARCADE_USERNAME, ARCADE_PASSWORD
  - The code sets:
    - anthropicApiKey = process.env.ANTHROPIC_API_KEY || vault.ANTHROPIC_API_KEY
    - modelManagerBaseUrl = process.env.MODEL_MANAGER_BASE_URL || vault.MODEL_MANAGER_BASE_URL
    - modelManagerApiKey = process.env.MODEL_MANAGER_API_KEY || vault.MODEL_MANAGER_API_KEY
- ARCADE integration:
  - Deploy scripts and config reference ARCADE_HOST and ARCADE_PORT (also present in config.toml under [arcadedb]).

Runtime behavior configuration (from code):
- Role config path: config/roles/{role}.toml (loaded by RoleLoader)
  - Typical fields in role TOML: role, capabilities (array), maxConcurrentTasks, and other tuning.
- Broker selection: code will use the local broker URL if configured, otherwise remote; supports an additional broker when both present.
- Heartbeat/registration RPC names:
  - quest_quest_register_agent (register)
  - quest_quest_agent_heartbeat (heartbeat)
  - quest_quest_unregister_agent (unregister)

Architecture
------------
Data flow and key components:

- Startup
  1. readConfig: src/index.ts uses agents-library.readConfig() to load config.toml.
  2. Environment and secrets: src/index.ts calls loadVaultCredentials to fetch required secrets (with env overrides).
  3. BaseAgent initialization: The agent creates a BaseAgent (agents-library) which sets up the KadiClient, ProviderManager, and MemoryService.
  4. Role loading: RoleLoader loads config from config/roles/{AGENT_ROLE}.toml and returns role-specific capabilities and maxConcurrentTasks.
  5. Worker creation: createWorkerAgent (WorkerAgentFactory) creates a BaseWorkerAgent and injects the ProviderManager and role settings.

- Runtime loop
  1. Registration: The agent invokes quest_quest_register_agent on mcp-server-quest to register itself (agent id: agent-worker-{role}) with capabilities and maxConcurrentTasks.
  2. Subscription: The agent subscribes to task.assigned events on the KADI broker. Events are filtered by role in payload.
  3. Task handling: On task.assigned, the worker uses provider tools and configured abilities to process tasks:
     - Tool-calling loop attempts to complete the task.
     - On success: publish task.completed
     - On known failure: publish task.failed
     - On rejection or inability: publish task.rejected
  4. Heartbeat: The agent invokes quest_quest_agent_heartbeat periodically to report status and currentTasks.
  5. Shutdown: On graceful shutdown the agent invokes quest_quest_unregister_agent.

Key components:
- BaseAgent (agents-library)
  - KadiClient: websocket connection to configured broker(s)
  - ProviderManager: manages external providers/tools the agent uses (model-manager, anthropic, etc.)
  - MemoryService: local memory/state for in-flight tasks (data path configurable via config.toml)
- RoleLoader (roles/RoleLoader.js)
  - Loads and validates role TOML and returns runtime config
- WorkerAgent (createWorkerAgent)
  - Implements the tool-calling task loop and event handlers
- mcp-server-quest (remote service)
  - External registry and heartbeat endpoint used for agent lifecycle

Deployment
----------
agent.json contains deploy targets to run Docker-based local deployments for each role and combined ("do-programmer", "do-artist", "do-designer", "do-all"). Highlights:

- Each deploy target runs a docker service named app (or role-named services for do-all) using the image agent-worker:0.3.3.
- Before starting the agent process the container runs:
  kadi secret receive --vault anthropic --vault model-manager --vault arcadedb && kadi run start:{role}
- Required vaults and secrets per deploy:
  - anthropic: ANTHROPIC_API_KEY
  - model-manager: MODEL_MANAGER_API_KEY, MODEL_MANAGER_BASE_URL
  - arcadedb: ARCADE_USERNAME, ARCADE_PASSWORD
- Secrets delivery is configured as "broker" in agent.json deploy.secrets.
- Deploy env examples include NODE_ENV=production, AGENT_ROLE, ARCADE_HOST, ARCADE_PORT and volumes map a host playground directory into /app/playground for role-specific persistence.

Development
-----------
Repository layout (relevant files):
- src/index.ts — main TypeScript entry
- roles/RoleLoader.js — role loader
- config.toml — primary runtime config
- config/roles/*.toml — role configs
- agent.json — agent manifest and scripts
- package.json — contains scripts and dependencies

Install and dev flow:
1. Install dependencies:
   - npm install

2. Preflight check:
   - npm run preflight
   - This script verifies your Node version (node --version).

3. Local development (live reload):
   - npm run dev
   - OR for a specific role:
     - npm run dev:artist
     - npm run dev:designer
     - npm run dev:programmer

4. TypeScript build:
   - npm run setup
   - OR npm run build

5. Type checking and lint:
   - npm run type-check
   - npm run lint

6. Tests:
   - npm test

Notes and tips:
- When running under KADI, run kadi install before kadi run start to ensure platform dependencies are present.
- Use AGENT_ROLE to select role on startup. Scripts are provided for convenience (start:artist, dev:designer, etc.).
- Broker URLs and networks can be configured in config.toml or overridden via KADI_BROKER_URL_LOCAL/KADI_BROKER_URL_REMOTE and KADI_NETWORK_LOCAL/KADI_NETWORK_REMOTE.
- Secrets and API keys should be provided via environment or the vault loader (loadVaultCredentials). Deploy targets expect vaults: anthropic, model-manager, arcadedb.

Contact / Contribution
----------------------
Follow repository contribution and code