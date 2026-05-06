# agent-builder

> KADI agent for game lifecycle management — shutdown, rebuild (MSBuild), and relaunch DaemonAgent

## Quick Start

1. Install and build
   - npm run preflight    # check node version
   - npm run setup        # npm install && npm run build

2. Configure
   - Edit config.toml in the repository root.
   - Required: at least one broker section ([broker.local] or [broker.remote]) with URL and NETWORKS.
   - Configure [build] (MSBUILD_PATH, SOLUTION_PATH, CONFIGURATION, PLATFORM) and [game] (EXE_PATH, WORKING_DIR, READY_TIMEOUT_MS, KILL_TIMEOUT_MS) to match your environment.

3. Run
   - Production: npm start        # runs node dist/index.js
   - Development (watch): npm run dev   # npx tsx watch src/index.ts

4. Cleanup
   - npm run clean   # rm -rf node_modules dist package-lock.json

## Tools

Registered tools included with this agent:

- create_release: Create a GitHub release with gh CLI — tags the repo, uploads the release zip, returns the release URL
- package_release: Package DaemonAgent Run/ folder into a release zip (exe + DLLs + Data/, excludes Logs/Screenshots/.pdb)
- rebuild_game: Full rebuild cycle: shut down game → MSBuild compile → relaunch → wait for KADI reconnect
- restart_game: Restart the DaemonAgent game (kill → relaunch → wait for KADI reconnect, no rebuild)
- shutdown_game: Shut down the running DaemonAgent game process

Abilities:
- ability-log (declared in agent.json)

Tools are registered from src/tools (entry registration in src/index.ts → registerAllTools).

## Configuration

Primary config file: config.toml

Important fields (as used by the agent):

- [agent]
  - ID — agent identifier (e.g. "agent-builder")
  - ROLE — agent role (e.g. "builder")
  - VERSION — agent version

- [logging]
  - LEVEL — log level (e.g. "debug", "info")

- [broker.local] and/or [broker.remote]
  - URL — broker websocket URL (at least one of local or remote required)
  - NETWORKS — array of network names to join
  - When both are present, the agent will prefer local for primary broker and include the other as an additional broker.

- [build]
  - MSBUILD_PATH — full path to MSBuild.exe (example in config.toml: "C:/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe")
  - SOLUTION_PATH — path to solution .sln (example: "C:/GitHub/DaemonAgent/DaemonAgent.sln")
  - CONFIGURATION — build configuration (e.g. "Debug")
  - PLATFORM — build platform (e.g. "x64")

- [game]
  - EXE_PATH — path to game exe (example: "C:/GitHub/DaemonAgent/Run/DaemonAgent_Debug_x64.exe")
  - WORKING_DIR — working directory for relaunch
  - READY_TIMEOUT_MS — ms to wait for game to signal ready over KADI
  - KILL_TIMEOUT_MS — ms to wait for process to exit after termination signal

- [secrets]
  - VAULTS — vault names to load (e.g. ["arcadedb"])
  - KEYS — secret keys to load (e.g. ["ARCADE_USERNAME", "ARCADE_PASSWORD"])

- [arcadedb]
  - HOST, PORT, USERNAME, DATABASE — used for logging to ArcadeDB if configured

Notes:
- The runtime enforces at least one broker (local or remote). See src/index.ts for broker resolution logic.
- The agent uses agents-library helpers: readConfig, loadVaultCredentials, setLogLevel, setAgentTag.

## Architecture

- Entry point: dist/index.js (source: src/index.ts).
- Core: builds a BaseAgent (agents-library) configured with agentId, role, version, broker URL(s) and networks.
- Tool registration: registerAllTools(client) (src/tools/index.js) registers the tools that implement shutdown/restart/rebuild and release packaging.
- Lifecycle:
  - Tools perform game lifecycle tasks (kill, MSBuild, package, relaunch).
  - The agent detects game reconnection via KADI event subscription (topic: game.ready) to determine when relaunch is complete.
- Configuration and secrets are read from config.toml; vault credentials may be loaded via loadVaultCredentials.

## Development

Scripts (package.json / agent.json):

- npm run preflight  — node --version
- npm run setup      — npm install && npm run build
- npm run build      — npx tsc
- npm start          — node dist/index.js
- npm run dev        — npx tsx watch src/index.ts
- npm run clean      — rm -rf node_modules dist package-lock.json

Key dependencies:
- agents-library ^0.1.11
- @kadi.build/core
- archiver (packaging helper)
- zod (validation)

Dev dependencies:
- typescript
- tsx (development watcher)
- @types/archiver
- @types/node

Build flow:
- Modify TypeScript in src/
- npm run build produces dist/
- Run with npm start or use npm run dev for live reload

---