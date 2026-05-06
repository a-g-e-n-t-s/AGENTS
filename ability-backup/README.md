# ability-backup

> KADI ability — backup/restore orchestrator for ArcadeDB via broker tools. Supports co-located and distributed topologies.

## Quick Start

```bash
cd ability-backup
npm install
kadi install
kadi run start
```

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
| **Version** | 0.1.3 |
| **Type** | ability |
| **Entrypoint** | `dist/index.js` |

### Abilities

- `secret-ability`: `*`

### Brokers

- **remote**: `wss://broker.dadavidtseng.com/kadi`

Note: A local config.toml is supported and used for broker resolution when present. Example (found in repo):

```toml
[broker.local]
URL = "wss://broker.dadavidtseng.com/kadi"
NETWORKS = ["arcadedb", "backup", "global"]
```

Secrets used by the ability should be placed in secrets.toml (encrypted vault). The agent follows a walk-up convention for config and secrets and supports environment variable overrides (see source for details).

## Architecture

ability-backup is a pure orchestrator that composes backup/restore pipelines from broker-provided tools. It supports both co-located and distributed deployment topologies with automatic detection.

Key points:
- Backup pipeline: backup-database (export → compress → upload).
- Restore pipeline: backup-restore (download → decompress → restore).
- Additional tools: backup-list (list cloud backups), backup-schedule (in-memory periodic schedules), backup-status (schedules & recent backups).
- Depends on broker tools such as arcade-backup / arcade-restore / arcade-db-info, cloud-upload / cloud-download (or URL-based fallbacks for distributed setups), file-compress / file-decompress, secret-get, and cloud-list.
- Runs an optional staging FileSharingServer for staging transfers and includes a tunnel client for distributed topologies.
- Configuration is discovered via a walk-up mechanism (config.yml / config.toml) and secrets are read from vaults (secrets.toml). Environment variables can override config values.
- The agent implements Convention Section 6 compliance: config and secret walk-up and KADI tunnel token lookup.

## Development

```bash
npm install
npm run build
kadi run start
```

You can also run locally in development mode:

```bash
npm run dev
```

---