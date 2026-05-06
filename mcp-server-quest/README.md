# mcp-server-quest

Comprehensive quest orchestration system with KĀDI broker integration, replacing mcp-shrimp-task-manager with enhanced multi-channel approval workflow and document-driven development.

## Overview

mcp-server-quest is an MCP (Model Context Protocol) server that provides **26 tools** for managing quests, tasks, agents, and approvals. It integrates with the KĀDI broker for event-driven multi-agent communication and supports approval workflows through Discord, Slack, and a web dashboard.

Note: The dashboard UI is now served by the separate mcp-client-quest package. This server package focuses on bootstrapping the data layer (Git-backed quest data repository and built-in templates) and exposing MCP endpoints; it no longer serves the dashboard UI directly.

### Key Features

- **Quest Management**: Create, revise, and manage quests with automatic task splitting
- **Two-Tier Approval**: Quest-level and task-level approval gates
- **Multi-Channel Approvals**: Discord, Slack, and Dashboard integration (UI provided by mcp-client-quest)
- **Task Orchestration**: Assign tasks to agents with dependency validation
- **File-based Storage**: Git-versioned data in `.quest-data/`
- **KĀDI Integration**: All agent MCP calls routed through broker
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

Build (as above) then:

```bash
node dist/mcp-server.js
```

Alternatively, use the provided start script:

```bash
npm start
```

The packaged/containerized deployment exposes the MCP HTTP transport on port 3100 by default (see Configuration).

### Development

Development scripts may be present in the repository (e.g., using tsx or other tooling). The package ships TypeScript sources; run your usual dev tooling (e.g., tsx or nodemon) if available in your local setup.

### Dashboard Access

The dashboard is no longer served from this package. To access the UI, run the mcp-client-quest package which connects to this server's MCP endpoints (by default MCP transport over HTTP on port 3100).

## Architecture

- **Node.js**: Built for Node 20 (container image uses node:20-alpine)
- **TypeScript**: 5.3+ with strict mode
- **MCP Protocol**: Standard tool invocation interface
- **Express**: Server dependency for HTTP endpoints
- **KĀDI Broker**: Event-driven agent communication via @modelcontextprotocol/sdk
- MCP transport configuration is influenced by environment variables (MCP_TRANSPORT_TYPE, MCP_PORT)

## Project Structure

```
mcp-server-quest/
├── src/
│   ├── index.ts           # MCP server entry point (bootstraps data layer and templates)
│   ├── tools/             # 26 MCP tool implementations
│   ├── models/            # Quest, Task, Agent, Approval models (including TemplateModel)
│   ├── prompts/           # Document generation prompts
│   └── utils/             # Shared utilities (git repo init, config)
├── .quest-data/           # Git-versioned quest data
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

On startup the server initializes the Git-backed quest data directory and loads built-in templates (see src/index.ts). The dashboard frontend has been extracted to mcp-client-quest.

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
- exposes port 3100 (mapped as MCP HTTP transport)
- env defaults in deploy: MCP_TRANSPORT_TYPE=http, MCP_PORT=3100, NODE_ENV=production
- resources: cpu 0.5, memory 512Mi, ephemeralStorage 512Mi

Runtime environment variables
- MCP_TRANSPORT_TYPE: transport type (e.g., "http")
- MCP_PORT: HTTP port (default in deploy/config: 3100)
- NODE_ENV: production/development

## License

MIT

---