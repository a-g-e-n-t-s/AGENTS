# ability-backup

> KADI ability — backup/restore orchestrator for ArcadeDB via broker tools. Supports co-located and distributed topologies.

## Quick Start

```bash
cd ability-backup
npm run setup        # installs deps and builds (npm install && npm run build)
kadi install         # register broker tools locally (if running against broker)
kadi run start
```

(You can also run the dev server without building using `npm run dev` — see Development.)

## Tools

| Tool | Description |
|------|-------------|
| backup-database | Back up a database and upload to cloud storage. |
| backup-list     | List available database backups stored in the cloud. |
| backup-restore  | Restore a database from a cloud backup. |
| backup-schedule | Create, update, or remove a periodic backup schedule. |
| backup-status   | List active backup schedules and recent cloud backups for a database. |

*(Run `kadi run start` and check broker for registered tools)*

## Configuration

### agent.json

| Field | Value |
|-------|-------|
| **Name** | ability-backup |
| **Version** | 0.1.3 |
| **Type** | ability |
| **Entrypoint** | `dist/index.js` |
| **Scripts** | `preflight`, `setup`, `build`, `start`, `dev`, `clean` (see package scripts) |
| **Build image** | `ability-backup:0.1.3` (image used in build metadata) |
| **Deploy targets** | `local` (docker) and `production` (akash/podman) — see deploy metadata for commands and resource hints |

Notes on deploy metadata:
- Services run the command: `kadi secret receive --vault backup && kadi run start`.
- Local deployment exposes container port 80 as host 8090 by default.
- Deployments declare required vaults: `tunnel` (requires `KADI_TUNNEL_TOKEN`) and `backup` (requires `DASHBOARD_USERNAME`, `DASHBOARD_PASSWORD`). Secrets are delivered via the broker by default.

### Abilities

- `secret-ability`: `*`

### Brokers

- **remote**: `wss://broker.dadavidtseng.com/kadi`

A local config.toml is supported and used for broker resolution when present. Example (found in repo):

```toml
[broker.local]
URL = "wss://broker.dadavidtseng.com/kadi"
NETWORKS = ["arcadedb", "backup", "global"]
```

Secrets used by the ability should be placed in secrets.toml (encrypted vault) when developing locally. When deployed the ability expects vaults delivered via the broker (see deploy metadata above). The agent follows a walk-up convention for config and secrets and supports environment variable overrides (see source for details). Notable env vars referenced in deployment/config:

- BROKER_URL — override broker resolution
- KADI_TUNNEL_TOKEN — tunnel token (vault `tunnel`)
- DASHBOARD_USERNAME / DASHBOARD_PASSWORD — credentials for the optional dashboard (vault `backup`)
- DASHBOARD_PORT — dashboard listen port (used in deploy env)

## Architecture

ability-backup is a pure orchestrator that composes backup/restore pipelines from broker-provided tools. It supports both co-located and distributed deployment topologies with automatic detection.

Key points:
- Backup pipeline: backup-database (export → compress → upload).
- Restore pipeline: backup-restore (download → decompress → restore).
- Additional tools: backup-list (list cloud backups), backup-schedule (in-memory periodic schedules), backup-status (schedules & recent backups).
- Depends on broker tools such as arcade-backup / arcade-restore / arcade-db-info, cloud-upload / cloud-download (or URL-based fallbacks for distributed setups), file-compress / file-decompress, secret-get, and cloud-list.
- Runs an optional staging FileSharingServer for staging transfers and includes a tunnel client for distributed topologies.
- Starts a small dashboard server (optional) — configured via DASHBOARD_PORT and protected by DASHBOARD_USERNAME / DASHBOARD_PASSWORD when enabled in deployment.
- Configuration is discovered via a walk-up mechanism (config.yml / config.toml) and secrets are read from vaults (secrets.toml). Environment variables can override config values.
- The agent implements Convention Section 6 compliance: config and secret walk-up and KADI tunnel token lookup.

## Development

Recommended local workflow:

```bash
npm run setup        # install deps and build
kadi install         # register tools with broker (if needed)
kadi run start
```

Build and watch:

```bash
npm run build        # compile TypeScript (npx tsc)
npm run dev          # development mode (npx tsx src/index.ts)
```

Other helper scripts:
- `npm run clean` — remove build artifacts and node_modules
- `npm run preflight` — check node version

---

If you need to inspect the build/deploy configuration, see agent.json (build/default and deploy sections) and config.toml in the repository.