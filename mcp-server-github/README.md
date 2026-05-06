# mcp-server-github

> GitHub operations MCP server

## Quick Start

```bash
cd mcp-server-github
npm install
kadi install
kadi run build
kadi run start
```

Note: The runtime entrypoint is dist/index.js (package.json start: "node dist/index.js"), so ensure you run the build step before starting.

## Configuration

### agent.json

| Field | Value |
|-------|-------|
| **Name** | mcp-server-github |
| **Version** | 0.1.0 |
| **Start script** | node dist/index.js |
| **Build (default)** | from: node:20-alpine, cli: latest |
| **Build run steps** | npm install -g bun; npm ci --include=dev; bun build ./src/index.ts --outdir ./dist --target node --external pino --external pino-pretty --external @octokit/rest; npm prune --omit=dev |
| **Build env** | NODE_ENV=production |

## Runtime / Environment notes

- Transport mode: The server checks MCP_TRANSPORT_TYPE (case-insensitive). If unset or set to "stdio", the server runs in STDIO mode and ANSI colors are disabled (NO_COLOR=1, FORCE_COLOR=0).
- Startup logs include the server name and version (config.mcpServerName / config.mcpServerVersion), the selected transport (config.mcpTransportType), the GitHub API host (config.githubHost or config.githubApiUrl), and whether a GitHub token is configured (token is masked in logs).
- In STDIO mode, fatal startup errors are written directly to stderr; otherwise they are logged via the logger.
- The server installs handlers for SIGTERM and SIGINT to log shutdown and exit gracefully. Uncaught exceptions are logged (including stack) and the process exits.
- The server uses the compiled output in dist/ (built by the kadi build process defined above).

## Development

```bash
npm install
kadi install
kadi run build
kadi run start
```

Notes:
- The build uses bun to compile TypeScript (src/index.ts) to dist/.
- The start script runs the compiled Node server (node dist/index.js).