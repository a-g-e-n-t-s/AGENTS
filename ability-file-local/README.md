# ability-file-local
> Local file operations for AGENTS: list, move, copy, delete, create, and watch files/folders

Overview
This kadi-ability provides local filesystem operations for the AGENTS orchestration platform. It exposes a set of tools for listing, moving, copying, deleting, creating, and watching files and directories. The ability is implemented in TypeScript and uses common Node.js libraries (chokidar for watching, archiver/tar/unzipper for archives). The published package entry point is dist/index.js (development entrypoint index.ts) and the agent metadata is defined in agent.json.

Quick Start
1. Clone or add the ability to your AGENTS abilities folder.
2. Install dependencies and build:
   npm run setup

3. Start the ability (production/build output):
   npm run start

Alternative direct run (local development, bypassing build step):
- Run in development mode (runs index.ts directly with tsx):
  npm run dev
- Serve over stdio (dev):
  npm run serve
- Serve in broker mode (dev):
  npm run serve:broker

Available npm scripts (from agent.json)
- preflight: node --version
- setup: npm install && npm run build
- build: npx tsc
- start: node dist/index.js
- dev: npx tsx index.ts
- serve: npx tsx index.ts stdio
- serve:broker: npx tsx index.ts broker
- clean: rm -rf node_modules abilities agent-lock.json package-lock.json dist

Tools
| Tool | Description |
|------|-------------|
| list | List files and directories in a path (supports filters, recursion options) |
| move | Move/rename files or directories |
| copy | Copy files or directories (preserve structure when requested) |
| delete | Delete files or directories (with safe/recursive options) |
| create | Create files or directories (create parent directories when required) |
| watch | Watch files or directories for events (create, change, delete) and emit events to the broker/stdio |

Configuration

agent.json
- name: ability-file-local
- type: ability
- version: 0.1.1
- description: Local file operations - list, move, copy, delete, create, watch
- entrypoint: dist/index.js
- scripts: defined as shown in Quick Start

config.toml
A repository-level config.toml is included to configure the local broker connection for this ability. Example fields present in config.toml:
- broker.local.URL — WebSocket URL for local broker (example: "ws://localhost:8080/kadi")
- broker.local.NETWORKS — array of network tags this ability announces (example: ["file"])
- broker.local.MODE — runtime mode (example: "native")

File paths and important files
- dist/index.js — compiled entrypoint (registered in agent.json)
- index.ts — TypeScript source entrypoint (used for development via tsx)
- agent.json — agent/ability metadata and scripts
- config.toml — local ability configuration for broker settings
- package.json (dependencies listed in the repository)
- abilities/ — (runtime path where kadi keeps installed abilities)
- agent-lock.json, package-lock.json — lock files cleaned by npm run clean

Environment and configuration
- This ability uses a config.toml for broker/local configuration. See config.toml for broker URL, networks, and mode.
- Environment variables can still be used by the runtime or passed by the kadi broker, but this repository does not automatically load a .env file (dotenv is not included as a dependency). If you rely on environment files, load them in your environment or add dotenv to the project.
- Example environment variables you might set in your runtime environment (optional):
  - LOG_LEVEL=info
  - WATCH_POLL_INTERVAL=1000

Note: Because this ability interacts directly with the local filesystem, ensure the runtime user has the necessary read/write permissions for paths you intend to operate on.

Architecture
High-level components
- Kadi Core (@kadi.build/core)
  - Routes incoming tool invocations to this ability (via stdio broker or kadi broker).
- Entry (index.ts / dist/index.js)
  - Registers tools with the Kadi runtime and wires handlers for each tool name.
- Tool Handlers (one per tool)
  - Implement the behavior for list, move, copy, delete, create, watch.
  - Validate input parameters (paths, flags) and perform FS operations.
- FileOps utilities
  - Utilities wrapping Node.js fs/promises and helper libraries for recursive operations.
- Watcher (chokidar)
  - Uses chokidar to monitor paths and emits events back to the broker or stdio.
- Archiver / Unpackers
  - Uses archiver, tar, and unzipper when creating or extracting archives as required by higher-level operations.

Data flow
1. A client invokes a tool (e.g., file:list) via the Kadi broker or stdio.
2. Kadi Core routes the invocation to this ability using the name specified in agent.json and the tool name registered by index.ts.
3. The registered handler receives the request payload (path, options).
4. Handler performs validation and calls FileOps utilities or Watcher.
5. FileOps uses Node.js fs APIs or archiver/unzipper/tar to perform operations.
6. Results (success, error, event notifications for watch) are sent back to the caller through the Kadi runtime channel (broker/stdio).

Security considerations
- This ability performs local filesystem I/O. Limit exposure by running in a controlled environment, validating inputs (no path traversal), and setting filesystem permissions appropriately.
- When used in multi-tenant environments, apply sandboxing or mount-level restrictions.

Development
Prerequisites
- Node.js (see preflight script to verify)
- npm
- kadi CLI (for integration testing with the runtime)
- TypeScript is used as a dev dependency; the build step produces dist/ via npx tsc. tsx is used for direct development runs.

Install and run locally
1. Install dependencies and build:
   npm run setup

2. Run the ability (built output):
   npm run start

3. For development (no build step, runs index.ts via tsx):
   npm run dev

4. Serve modes (development):
   npm run serve
   npm run serve:broker

5. Install to kadi runtime and run:
   kadi install
   kadi run start

Testing and iterative development
- Modify index.ts to add or update tool registrations.
- Use npm run dev (tsx) to run TypeScript directly for fast iteration (no build step).
- When changing TypeScript types or production code, run npm run build (part of npm run setup) to regenerate dist/.

Cleaning
- To remove node_modules and runtime artifacts including built files:
  npm run clean

Extending tools
- To add a new tool:
  1. Update index.ts to register the new tool name with @kadi.build/core tool registration API.
  2. Implement a handler that performs the required filesystem logic and returns a structured result or emits events.
  3. Build (npm run build) for production or restart dev mode (npm run dev).

Dependencies (selected)
- @kadi.build/core — integration with the Kadi runtime
- archiver — ^6.0.1
- chokidar — ^3.6.0
- tar — ^6.2.0
- tsx — ^4.21.0
- unzipper — ^0.12.3
- typescript (devDependency) — ^5.0.0
- @types/node, @types/archiver, @types/tar, @types/unzipper — dev types present

Support and issues
- Report issues to your AGENTS/kadi project issue tracker. Include dist/index.js or index.ts, sample request payload, expected behavior, and actual behavior.

License
- Check your repository root for a LICENSE file. If none exists, coordinate with your organization to add an appropriate license.

This README provides the essential information to run, configure, and extend the ability-file-local kadi-ability. For implementation details, see index.ts (development source) and dist/index.js (built entrypoint).

## Quick Start

```bash
cd ability-file-local
npm run setup
npm run start
```

## Tools

| Tool | Description |
|------|-------------|
| list | List files and directories in a path (supports filters, recursion options) |
| move | Move/rename files or directories |
| copy | Copy files or directories (preserve structure when requested) |
| delete | Delete files or directories (with safe/recursive options) |
| create | Create files or directories (create parent directories when required) |
| watch | Watch files or directories for events and emit events to the broker/stdio |

## Configuration

### agent.json

| Field | Value |
|-------|-------|
| **Version** | 0.1.1 |
| **Type** | ability |
| **Entrypoint** | `dist/index.js` |

## Architecture

High-level components
- Entry (index.ts / dist/index.js) — registers tools and handlers.
- Tool Handlers — list, move, copy, delete, create, watch implementations.
- FileOps utilities — fs/promises helpers and archive/unpack helpers.
- Watcher (chokidar) — emits file system events to the broker/stdio.
- Kadi Core (@kadi.build/core) — runtime routing and invocation.

Data flow
1. Kadi runtime invokes a tool by name.
2. Handler validates input and performs file operations or registers watchers.
3. Results and events are returned via the broker or stdio channel.