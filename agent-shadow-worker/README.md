# agent-shadow-worker

> KADI Shadow Agent for worktree monitoring and backups

## Quick Start

```bash
cd agent-shadow-worker
npm install
kadi install
npm run build
kadi run start            # uses AGENT_ROLE from config.toml or AGENT_ROLE env
# or run a role-specific start:
kadi run start:artist
kadi run start:designer
kadi run start:programmer
```

## Tools

| Tool | Description |
|------|-------------|
| *(Tools and runtime capabilities are registered at broker when the agent starts. Run `kadi run start` and check your broker for registered topics/tools.)* | Publishes shadow events and responds according to configured role |

The agent publishes role-specific event topics, for example:
- shadow-{role}.backup.completed
- shadow-{role}.backup.failed

## Configuration

### agent.json

| Field | Value |
|-------|-------|
| **Name** | agent-shadow-worker |
| **Version** | 0.1.2 |
| **Type** | agent |
| **Entrypoint** | dist/index.js |
| **Notable scripts** | start, start:artist, start:designer, start:programmer, dev, build, setup, preflight, type-check, lint, test, clean |

See agent.json for full build and deploy profiles.

### config.toml (important fields)

The agent reads configuration from config.toml and role-specific files under config/roles/{role}.toml. Notable fields present in the repository:

- [agent]
  - ID — agent identifier (example: "agent-shadow-worker")
  - ROLE — default role (artist/programmer/designer). AGENT_ROLE env var overrides this.
  - VERSION — local agent config version (the repo's config.toml currently sets VERSION = "1.0.0")

- [logging]
  - LEVEL — log level (info, debug, etc.)

- [broker.local] / [broker.remote]
  - URL — broker URL (e.g. ws://localhost:8080/kadi or wss://broker.dadavidtseng.com/kadi)
  - NETWORKS — array of network names used for network resolution

- [worktree]
  - WORKER_PATH — filesystem path to the worker playground (e.g. C:/GitHub/agent-playground-artist)
  - SHADOW_PATH — filesystem path to the shadow playground (e.g. C:/GitHub/agent-playground-shadow-artist)
  - WORKER_BRANCH — branch name used on the worker repo
  - SHADOW_BRANCH — branch name used on the shadow repo

These worktree settings are used by the role loader / shadow logic to monitor and auto-initialize playground repositories and branches.

- [secrets]
  - VAULTS — array of vault names (example: ["anthropic", "model-manager", "arcadedb"])
  - KEYS — list of vault keys expected (ANTHROPIC_API_KEY, MODEL_MANAGER_API_KEY, MODEL_MANAGER_BASE_URL, ARCADE_USERNAME, ARCADE_PASSWORD)

- [arcadedb]
  - HOST, PORT, USERNAME, DATABASE — ArcadeDB connection defaults used for telemetry/logging if configured

Secrets are provided via vaults (see secrets.toml for local encrypted values). The deploy profiles require the following vaults/keys:

- anthropic: ANTHROPIC_API_KEY
- model-manager: MODEL_MANAGER_API_KEY, MODEL_MANAGER_BASE_URL
- arcadedb: ARCADE_USERNAME, ARCADE_PASSWORD

In production deployments the image runs a kadi secret receive command to fetch the vaults before starting.

### Brokers

The agent will prefer a local broker when configured, and can also use a remote broker.

- **local**: ws://localhost:8080/kadi
- **remote**: wss://broker.dadavidtseng.com/kadi

Broker URLs are read from config.toml ([broker.local] / [broker.remote]). The agent also reads NETWORKS arrays from those sections for network resolution.

## Architecture

agent-shadow-worker is a generic shadow agent that monitors and backs up worker agent worktrees.

- Role-driven: supports multiple roles (artist, programmer, designer). Role is selected by the AGENT_ROLE environment variable or the default in config.toml.
- Role loader: loads role-specific configuration from config/roles/{role}.toml using ShadowRoleLoader.
- Worktree management: monitors worker and shadow worktrees, can auto-create missing playground repositories and initialize branches.
- Broker connectivity: connects to a broker (local or remote), and publishes events such as shadow-{role}.backup.completed and shadow-{role}.backup.failed.
- Optional external credentials: reads vault credentials (Anthropic, Model Manager, ArcadeDB) via loadVaultCredentials; useful for integrations and telemetry.
- Logging and timing: configurable via config.toml [logging]; uses agents-library logger and timer utilities.

## Development

Basic development commands:

```bash
npm install
# sanity check (preflight)
npm run preflight

# development (hot reloading)
npm run dev               # uses config.toml default role
npm run dev:artist
npm run dev:designer
npm run dev:programmer

# build / setup
npm run build
npm run setup             # alias to build in package scripts

# tests / lint
npm run test
npm run lint
npm run type-check

# run (after build)
kadi run start
kadi run start:artist
kadi run start:designer
kadi run start:programmer

# clean
npm run clean
```

Notes:
- Role selection: AGENT_ROLE env var overrides config.toml agent.ROLE. Example: AGENT_ROLE=artist kadi run start
- Config files: edit config.toml and role-specific files under config/roles/{role}.toml. Secrets belong in secrets.toml (encrypted vault) and are fetched with kadi secret commands in production images.
- To fetch vault secrets locally when testing the same flow as deploy: kadi secret receive --vault anthropic --vault model-manager --vault arcadedb

## Deployment

agent.json includes deploy profiles for local Docker-based runs:
- do-programmer, do-artist, do-designer: run a single role container (image: agent-shadow-worker:0.1.2). Each profile sets AGENT_ROLE and maps a host playground volume.
  - The container command uses: kadi secret receive --vault anthropic --vault model-manager --vault arcadedb && kadi run start:{role}
  - Deploy profiles also set ARCADE_HOST and ARCADE_PORT environment variables (e.g. ARCADE_HOST=arcadedb.dadavidtseng.com and ARCADE_PORT=443) so the agent can connect to ArcadeDB if configured.
  - Host volume mappings provided in the profiles are:
    - ~/agent-playground-shadow-programmer:/app/playground
    - ~/agent-playground-shadow-artist:/app/playground
    - ~/agent-playground-shadow-designer:/app/playground

- do-all: runs three containers (programmer, artist, designer) together.

Each deploy profile expects the vaults listed in the Secrets section and delivers secrets via the broker (delivery: broker). The container command runs:
kadi secret receive --vault anthropic --vault model-manager --vault arcadedb && kadi run start:{role}

See agent.json -> deploy for the full configuration (images, env, volumes, restart policy, and required vault keys).

---

If nothing else, run kadi run start and check your broker for registered topics and agent status.

---