# ability-tunnel

> Network tunnel ability
>
> Unified tunnel ability - exposes local services via kadi-tunnel, SSH, frpc, ngrok, serveo, localtunnel, pinggy, or localhost.run

## Quick Start

```bash
cd ability-tunnel
npm run setup          # installs deps and builds (same as: npm install && npm run build)
kadi install
kadi run start
```

For local development (no build step):

```bash
npm install
npm run dev            # runs index.ts via tsx
```

You can also run the built entry directly:

```bash
npm run build
npm start              # node dist/index.js
```

## Tools

| Tool / Mode | Description |
|-------------|-------------|
| kadi tunnel (tunnel.kadi) | Tunnel via kadi infrastructure (tunnel.kadi.build), supports wss transport and kadi control API |
| ssh (tunnel.ssh) | SSH-based reverse tunnels (custom host/port/user/key) |
| frpc (tunnel.frpc) | frp client config (server address/port) |
| ngrok, serveo, localtunnel, pinggy, localhost.run | Other supported public tunnel providers (available modes in the ability) |
| (Runtime) | The ability exposes a unified interface to create/manage tunnels; see config.toml for defaults and per-mode settings |

## Configuration

### agent.json

| Field | Value |
|-------|-------|
| **Name** | ability-tunnel |
| **Version** | 0.1.0 |
| **Type** | ability |
| **Entrypoint** | `dist/index.js` |
| **Description** | Unified tunnel ability - exposes local services via kadi-tunnel, SSH, frpc, ngrok, serveo, localtunnel, pinggy, or localhost.run |

### config.toml

Configuration is provided via config.toml at the repository root. Secrets should go into secrets.toml (encrypted vault).

Example/config fields:

[tunnel and broker basics]
- broker.local.URL = "ws://localhost:8080/kadi"
- broker.local.NETWORKS = ["infra"]
- broker.local.MODE = "native"

[tunnel defaults]
- tunnel.DEFAULT_PORT = 3000
- tunnel.DEFAULT_MODE = "kadi"
- tunnel.TIMEOUT_MS = 30000
- tunnel.MAX_CONCURRENT = 5
- tunnel.AUTO_RECONNECT = true
- tunnel.MAX_RECONNECT_ATTEMPTS = 3
- tunnel.RECONNECT_DELAY_MS = 5000

[per-mode settings]
- [tunnel.kadi]
  - SERVER = "tunnel.kadi.build"
  - SSH_PORT = 2222
  - DOMAIN = ""
  - TRANSPORT = "wss"
  - WSS_HOST = ""
  - AGENT_ID = ""
  - CONTROL_API_URL = ""
- [tunnel.ssh]
  - HOST = ""
  - PORT = 22
  - USER = ""
  - KEY_PATH = ""
- [tunnel.frpc]
  - SERVER_ADDR = ""
  - SERVER_PORT = 7000

Adjust these values to match your environment and providers.

## Architecture

<!-- TODO: Add Architecture content -->

## Development

Install and build:

```bash
npm install
npm run build
kadi run start
```

Helpful scripts defined in package.json / agent.json:
- npm run preflight — check Node.js version (runs: node --version)
- npm run setup — installs deps and builds (npm install && npm run build)
- npm run build — compile TypeScript to dist/ (npx tsc)
- npm start — runs node dist/index.js
- npm run dev — runs index.ts via tsx for fast development
- npm run serve — run in stdio mode: npx tsx index.ts stdio
- npm run serve:broker — run in broker mode: npx tsx index.ts broker
- npm run clean — remove node_modules, abilities, agent-lock.json, package-lock.json, dist

---

If no changes are necessary to your deployment, the existing quick start (kadi install; kadi run start) will continue to work — just ensure you build first (npm run build) or use npm run dev for development.

---