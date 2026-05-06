# agents-library
> Shared utilities, factories, and producer helpers for the KĀDI multi-agent orchestration platform.

Overview
--------
agents-library is a kadi-package that centralizes common primitives used across KĀDI agents: base classes with lifecycle and retry/circuit-breaker behavior, event publishing to the KĀDI broker, worker and shadow agent factories, tool invocation helpers (including Claude orchestration), and configuration/load utilities. It reduces duplication between worker agents, shadow agents, and the agent-producer.

Key exports (source files referenced)
- Utilities and core classes
  - BaseBot, BaseBotConfig — ./base-bot.js
  - BaseAgent, BaseAgentConfig, BaseAgentProviderConfig, BaseAgentMemoryConfig — ./base-agent.js
  - KadiEventPublisher, PublisherConfig, validateTopicPattern — ./kadi-event-publisher.js
  - logger, setLogLevel, setAgentTag, setLogTransport, MODULE_AGENT, MODULE_SLACK_BOT, MODULE_DISCORD_BOT, MODULE_TASK_HANDLER, MODULE_TOOLS — ./utils/logger.js
  - timer, Timer — ./utils/timer.js
  - isWsl, toNativePath — ./utils/path-utils.js
  - loadVaultCredentials, loadModelManagerCredentials, VaultCredentials, ModelManagerCredentials — ./utils/vault.js
  - loadConfig, registerConfigMapping, LoadConfigResult — ./utils/config.js
  - loadDirective, DirectiveContext, DirectiveExport — ./utils/directive.js
  - Config, readConfig, readConfigFile — ./utils/read-config.js
- Factories and agent helpers
  - WorkerAgentFactory, BaseWorkerAgent, createWorkerAgent
  - ShadowAgentFactory, BaseShadowAgent, createShadowAgent, ShadowAgentConfigSchema
- Producer / tool invocation helpers
  - invokeShrimTool, orchestrateWithClaude, publishToolEvent, classifyToolError, isToolSuccess, isToolFailure
  - Types: InvokeOptions, ShrimpToolResult, ToolDefinition, ToolInvocation, OrchestrationOptions, OrchestrationResult, etc.
- Types for configuration, events, and tool schemas (AgentRole, WorkerAgentConfig, ShadowAgentConfig, WorkerBehaviors, PathConfig, NetworkConfig, TaskAssignedEvent, TaskCompletedEvent, TaskFailedEvent, TaskRejectedEvent, BackupEvent, ToolInvocationResult, ErrorClassification, ...)

Quick Start
-----------
1. Install package dependencies:
npm install

2. Register/install package with KĀDI runtime (project root):
kadi install

3. Start the service using KĀDI run script:
kadi run start

Notes:
- Use a .env file for local secrets (dotenv is a dependency). Typical environment variables consumed by helpers include KADI_BROKER_URL, KADI_BROKER_RETRY, VAULT_TOKEN, MODEL_MANAGER_TOKEN, and CLAUDE_API_KEY (Anthropic/Claude SDK via @anthropic-ai/sdk).
- Shadow agents watch filesystems (chokidar is used for file watching) and may require appropriate file permissions.
- Source entry point: src/index.ts — exports are implemented in the corresponding compiled files (e.g., ./base-bot.js, ./kadi-event-publisher.js).

Tools
-----
| Tool | Description |
|------|-------------|
| BaseBot | Abstract base bot with circuit breakers, retries, and common lifecycle hooks (./base-bot.js). |
| BaseAgent | Base agent class with lifecycle management and provider integration (./base-agent.js). |
| KadiEventPublisher | Reliable publisher to the KĀDI broker with connection retry/backoff and topic validation (./kadi-event-publisher.js). |
| validateTopicPattern | Validator for KĀDI topic patterns used by publishers and subscribers. |
| WorkerAgentFactory | Factory for creating typed worker agents (artist, designer, programmer). |
| BaseWorkerAgent | Worker agent base class with work loop, heartbeats, and task handling. |
| createWorkerAgent | Convenience helper to quickly create a worker agent from config. |
| ShadowAgentFactory | Factory for creating shadow/backup agents that watch worktrees and git state. |
| BaseShadowAgent | Base class for shadow agents with filesystem and git monitoring and backup event emission. |
| createShadowAgent | Convenience helper for shadow agent instantiation. |
| ShadowAgentConfigSchema | Zod schema used to validate shadow agent configuration. |
| invokeShrimTool | Invoke shrimp-task-manager tools via KĀDI protocol with retry and error classification. |
| orchestrateWithClaude | Orchestration helper that coordinates Claude API calls with tool invocation ("Option C" pattern). |
| publishToolEvent | Standardized publisher helper for emitting tool-related events to the KĀDI broker. |
| classifyToolError | Error classifier to label transient vs permanent failures and drive retry logic. |
| isToolSuccess / isToolFailure | Type guards for tool invocation results. |
| logger | Central logger with module constants (MODULE_AGENT, MODULE_TOOLS, etc.), and runtime helpers setLogLevel, setAgentTag, setLogTransport (./utils/logger.js). |
| loadDirective | Helper to load and execute directive exports for custom behaviors (./utils/directive.js). |
| readConfig / readConfigFile / Config | Utilities for reading structured config files and runtime config (./utils/read-config.js). |

Configuration
-------------
Configuration in this package is expressed via typed interfaces and Zod schemas. Typical configuration sources are environment variables, JSON/YAML config files, and secret stores (Vault), loaded through loadConfig and loadVaultCredentials.

Common config types and fields
- AgentRole — "artist" | "designer" | "programmer"
- WorkerAgentConfig
  - id: string
  - role: AgentRole
  - concurrency: number
  - capabilities: string[]
  - network?: NetworkConfig
  - paths?: PathConfig
- WorkerBehaviors
  - Optional overrides/hooks to customize worker behavior and task handling (exported types for runtime injection)
- ShadowAgentConfig
  - id: string
  - watchPaths: string[]
  - gitRepo?: { path: string; branch?: string }
  - backupIntervalSecs?: number
  - publisher?: PublisherConfig
  - validated by: ShadowAgentConfigSchema
- BaseBotConfig
  - circuitBreaker: { failureThreshold: number; cooldownMs: number }
  - retry: { maxAttempts: number; backoffMs: number }
- PathConfig
  - worktree: string
  - tempDir?: string
- NetworkConfig
  - kadiBrokerUrl: string
  - kadiRetry: { attempts: number; backoffMs: number }
- PublisherConfig (used by KadiEventPublisher)
  - topicPrefix: string
  - clientId?: string
  - connectTimeoutMs?: number

Loading and validation
- loadConfig(...) from ./utils/config.js returns LoadConfigResult (typed).
- registerConfigMapping(...) allows mapping file-based config to typed structures.
- readConfig/readConfigFile and Config from ./utils/read-config.js provide helpers for reading structured config files (JSON/YAML).
- loadDirective(...) from ./utils/directive.js loads directive modules/exports used to extend agent behavior.
- ShadowAgentConfigSchema (Zod) enforces required shadow agent fields.

Secrets and credentials
- loadVaultCredentials(...) and loadModelManagerCredentials(...) in ./utils/vault.js read credentials from Vault or environment variables. Common env vars: VAULT_TOKEN, VAULT_ADDR, MODEL_MANAGER_TOKEN.
- Claude integration expects the Anthropic/Claude SDK credential via CLAUDE_API_KEY and uses @anthropic-ai/sdk as the client library.

Architecture
------------
High-level data flow
1. Producer / orchestrator creates tasks and orchestrates multi-step operations using orchestrateWithClaude and invokeShrimTool.
2. Producer publishes TaskAssignedEvent to the KĀDI broker via KadiEventPublisher (publishToolEvent and KadiEventPublisher).
3. Broker routes the event to workers (based on topics). Worker agents (created via WorkerAgentFactory/createWorkerAgent) subscribe to their task topics and begin work.
4. Worker handlers use BaseWorkerAgent and BaseBot primitives for retry/circuit-breaker behavior, and they call invokeShrimTool to run shrimp-task-manager tools where applicable.
5. Success/failure results are published back as TaskCompletedEvent, TaskFailedEvent, or TaskRejectedEvent (for capability mismatches). publishToolEvent provides standardized metadata (EventMetadata).
6. Shadow agents (created via ShadowAgentFactory/createShadowAgent) monitor filesystem and git state (chokidar is used for file watching), emit BackupEvent for snapshots, and serve as hot-backups for worker state.
7. The producer can call orchestrateWithClaude to combine AI model responses (Anthropic/Claude via @anthropic-ai/sdk) with deterministic tool invocations (Option C) — tool invocations are recorded as ToolInvocation events for traceability.
8. Error management uses classifyToolError (classifies errors including ErrorType/transient vs permanent) to decide retry strategies and isToolSuccess/isToolFailure guards to branch behavior.

Key components
- KadiEventPublisher — reliable broker connectivity and topic validation
- BaseBot — common retry/circuit-breaker and timing utilities
- Worker/Shadow factories — encapsulate lifecycle and wiring for agents
- invokeShrimTool / publishToolEvent — standard interfaces between agent code and shrimp task manager tools
- Orchestration helpers — orchestrateWithClaude that handles tool-invocation orchestration together with Claude responses
- Utilities — logger (with setLogLevel, setAgentTag, setLogTransport), timer, path helpers, config & vault loaders, directive loader, and read-config helpers

Development
-----------
Repository layout (relevant source files)
- src/index.ts — package exports and public API surface
- src/base-bot.ts, src/base-agent.ts — core classes
- src/kadi-event-publisher.ts — broker publisher
- src/utils/* — logger.ts, timer.ts, path-utils.ts, vault.ts, config.ts, directive.ts, read-config.ts
- tests/ — unit tests (if present)

Install & build
npm install
# register with your KĀDI project
kadi install

Build (TypeScript)
npx tsc

Run (via KĀDI)
kadi run start

Testing
# run tests with Vitest
npx vitest

Linting / formatting
- This package does not prescribe a specific linter/formatter; add eslint/prettier to your repo if desired.

Local development tips
- Use .env with dotenv for local environment variables.
- Use loadVaultCredentials and loadModelManagerCredentials to source secrets in development; fallback to environment variables when Vault is not available.
- Inspect logger module helpers (setLogLevel, setAgentTag, setLogTransport) and module constants (MODULE_AGENT, MODULE_TOOLS, etc.) to tag and control logs consistently across agents.
- Use ShadowAgentConfigSchema to validate shadow agent configuration before starting the agent.
- Use loadDirective to load custom directive modules that extend agent behaviors at runtime.
- Use readConfig/readConfigFile for structured JSON/YAML config files.
- Shadow agents rely on chokidar (dependency) for filesystem watching; ensure the environment supports file watch events if running in containers/VMs.

Contributing
------------
- Follow TypeScript typings and export new utilities via src/index.ts so consumers can import from agents-library.
- Add tests alongside new features and run npx vitest.
- When adding broker topics, use validateTopicPattern to ensure compatibility with KĀDI topic naming rules.

License and governance
- This file documents the package usage and development conventions. Follow your organization's publishing and release processes for package versioning and deployment.

---