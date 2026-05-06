# mcp-server-quest

Comprehensive quest orchestration system with KĀDI broker integration, replacing mcp-shrimp-task-manager with enhanced multi-channel approval workflow and document-driven development.

## Overview

mcp-server-quest is an MCP-related package that provides tooling for managing quests, tasks, agents, and approvals (tool implementations live in src/tools). IMPORTANT: this package now focuses on bootstrapping the data layer (Git-backed quest data repository and built-in templates) and initializing runtime templates. The entry point (src/index.ts) initializes the `.quest-data/` Git repo and built-in templates; it does not itself host the dashboard UI and does not automatically start an MCP HTTP server. The dashboard UI is served by the separate mcp-client-quest package or by a separate runtime that exposes MCP endpoints.

### Key Features

- **Quest Management**: Create, revise, and manage quests with automatic task splitting
- **Two-Tier Approval**: Quest-level and task-level approval gates
- **Multi-Channel Approvals**: Discord, Slack, and Dashboard integration (UI provided by mcp-client-quest)
- **Task Orchestration**: Assign tasks to agents with dependency validation
- **File-based Storage**: Git-versioned data in `.quest-data/`
- **KĀDI Integration**: Tool implementations use @modelcontextprotocol/sdk for broker interactions
- **Data Layer Bootstrap**: Initializes Git repo and built-in quest templates on startup

## Installation

```bash
# Install dependencies
npm ci

# Build the project (TypeScript)
npx tsc
```

The project build configuration is set up to produce a production image from node:20-alpine (see agent.json build section).

## Quick Start

### Start (production)

Build (as above). Running the packaged start script will initialize the data layer and built-in templates:

```bash
npm start
# or
node dist/mcp-server.js
```

Note: Running the start script (dist/mcp-server.js) runs the initialization (Git repo + templates) and graceful shutdown handlers. It does not, by itself, start an HTTP MCP transport or dashboard UI. To run a full MCP server that exposes HTTP transport and serves endpoints, use a runtime that wires the tool implementations into an MCP server or run a companion package that provides the transport layer.

### Development

You can run the TypeScript sources directly with your preferred dev tooling (e.g., tsx or nodemon) to execute the initialization flow defined in src/index.ts:

```bash
# Example with tsx (if installed)
npx tsx src/index.ts
```

For iterative development of the tools and integrations, run your dev server/process that wires the tools into an MCP transport when needed.

### Dashboard Access

The dashboard UI is provided by the mcp-client-quest package. The client connects to an MCP transport endpoint (HTTP or broker) where an MCP server/runtime exposes the tool endpoints. This repository does not include the dashboard frontend.

## Architecture

- **Node.js**: Built for Node 20 (container image uses node:20-alpine)
- **TypeScript**: 5.3+ with strict mode
- **MCP Protocol**: Tool implementations use @modelcontextprotocol/sdk for broker-driven interactions
- **Express**: Present as a dependency in the project, but this package's entry point focuses on data bootstrap rather than serving HTTP endpoints by default
- Deploy/build behavior is configured via agent.json; deployments may expose an HTTP port for MCP transport (see Configuration)

## Project Structure

```
mcp-server-quest/
├── src/
│   ├── index.ts           # Entry point: bootstraps data layer and initializes templates
│   ├── tools/             # MCP tool implementations
│   ├── models/            # Quest, Task, Agent, Approval models (including TemplateModel)
│   ├── prompts/           # Document generation prompts
│   └── utils/             # Shared utilities (git repo init, config)
├── .quest-data/           # Git-versioned quest data (initialized at startup)
└── tests/                 # Test files
```

Note: The dashboard UI and WebSocket client are provided by the mcp-client-quest package; this repository initializes the quest data repo and built-in templates (see src/index.ts).

## MCP Tools (26 total)

(unchanged — tool list retained in source)

### Agent Management (4)
- `quest_register_agent`: Register an agent with capabilities
- `quest_unregister_agent`: Remove an agent from the system
- `quest_list_agents`: List all registered agents
- `quest_agent_heartbeat`: Agent heartbeat for health monitoring

### Quest Lifecycle (6)
- `quest_create_quest`: Create a new quest with requirements and design
- `quest_query_quest`: Query quest info (detail="summary" for progress, detail="full" for complete data)
- `quest_list_quest`: List all quests with optional status filter and pagination
- `quest_update_quest`: Revise quest requirements and design
- `quest_archive_quest`: Archive a quest
- `quest_delete_quest`: Permanently delete a quest

### Task Management (11)
- `quest_split_task`: Split quest into implementation tasks
- `quest_assign_task`: Assign tasks to agents
- `quest_query_task`: Query tasks by ID (full details) or search/filter
- `quest_update_task`: Update task metadata and/or status (with agent authorization)
- `quest_delete_task`: Delete a task
- `quest_submit_task_result`: Submit task implementation result
- `quest_verify_task`: Verify task completion
- `quest_log_implementation`: Log implementation details
- `quest_plan_task`: Plan task implementation approach
- `quest_analyze_task`: Analyze task requirements
- `quest_reflect_task`: Reflect on task implementation

### Approval Workflow (4)
- `quest_request_quest_approval`: Request human approval for a quest plan
- `quest_request_task_approval`: Request human approval for a completed task
- `quest_submit_approval`: Submit approval decision (approve/reject/revise)
- `quest_query_approval`: Check approval status

### Workflow Guidance (1)
- `quest_workflow_guide`: Get quest workflow documentation and guidance

## Development

Built to replace mcp-shrimp-task-manager with:
- Enhanced approval workflow (Discord/Slack/Dashboard)
- Document-driven development (requirements.md, design.md)
- Improved task splitting with dependency validation
- Data-layer initialization (Git repo + built-in templates)

On startup the package initializes the Git-backed quest data directory and loads built-in templates (see src/index.ts). The dashboard frontend has been extracted to mcp-client-quest.

## Configuration

agent.json highlights (located at project root)

- name: mcp-server-quest
- version: 0.1.0
- scripts.start: node dist/mcp-server.js

Build configuration (used for image builds)
- build.default.from: node:20-alpine
- build.default.run: ["npm ci --include=dev", "npx tsc", "npm prune --omit=dev"]
- build.default.env: { "NODE_ENV": "production" }

Deploy (example akash-mainnet target)
- exposes port 3100 (mapped as service port)
- env defaults in deploy: MCP_TRANSPORT_TYPE=http, MCP_PORT=3100, NODE_ENV=production
- resources: cpu 0.5, memory 512Mi, ephemeralStorage 512Mi

Runtime environment variables
- MCP_TRANSPORT_TYPE: transport type (e.g., "http") — deployments/runtimes that expose MCP endpoints may use this
- MCP_PORT: HTTP port (default in deploy/config: 3100)
- NODE_ENV: production/development

Note: While the deployment configuration exposes port 3100 and provides MCP-related env defaults, this package's entry point focuses on data initialization. Running an MCP server that exposes HTTP endpoints requires wiring the tool implementations into an MCP transport/runtime.

## License

MIT