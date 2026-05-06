<div align="center">
  <h1>mcp-server-git</h1>
  <p><b>A secure and scalable Git MCP server giving AI agents powerful version control for local and (soon) serverless environments. STDIO & Streamable HTTP</b>
  <div>27 Tools • 1 Resource • 1 Prompt</div>
  </p>
</div>

<div align="center">

[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg?style=flat-square)](./CHANGELOG.md) [![MCP Spec](https://img.shields.io/badge/MCP%20Spec-2025--06--18-8A2BE2.svg?style=flat-square)](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/changelog.mdx) [![MCP SDK](https://img.shields.io/badge/MCP%20SDK-^1.20.2-green.svg?style=flat-square)](https://modelcontextprotocol.io/) [![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg?style=flat-square)](./LICENSE) [![Status](https://img.shields.io/badge/Status-Stable-brightgreen.svg?style=flat-square)](https://github.com/dadavidtseng/mcp-server-git/issues) [![TypeScript](https://img.shields.io/badge/TypeScript-^5.9.3-3178C6.svg?style=flat-square)](https://www.typescriptlang.org/) [![Bun](https://img.shields.io/badge/Bun-v1.2.21-blueviolet.svg?style=flat-square)](https://bun.sh/)

</div>

---

## 🛠️ Tools Overview

This server provides 27 comprehensive Git operations organized into six functional categories:

| Category                  | Tools                                                                                                                          | Description                                                                                                           |
| :------------------------ | :----------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| **Repository Management** | `git_init`, `git_clone`, `git_status`, `git_clean`                                                                             | Initialize repos, clone from remotes, check status, and clean untracked files                                         |
| **Staging & Commits**     | `git_add`, `git_commit`, `git_diff`                                                                                            | Stage changes, create commits, and compare changes                                                                    |
| **History & Inspection**  | `git_log`, `git_show`, `git_blame`, `git_reflog`                                                                               | View commit history, inspect objects, trace line-by-line authorship, and view ref logs                                |
| **Branching & Merging**   | `git_branch`, `git_checkout`, `git_merge`, `git_rebase`, `git_cherry_pick`                                                     | Manage branches, switch contexts, integrate changes, and apply specific commits                                       |
| **Remote Operations**     | `git_remote`, `git_fetch`, `git_pull`, `git_push`                                                                              | Configure remotes, download updates, synchronize repositories, and publish changes                                    |
| **Advanced Workflows**    | `git_tag`, `git_stash`, `git_reset`, `git_worktree`, `git_set_working_dir`, `git_clear_working_dir`, `git_wrapup_instructions` | Tag releases, stash changes, reset state, manage worktrees, set/clear session directory, and access workflow guidance |

## 📦 Resources Overview

The server provides resources that offer contextual information about the Git environment:

| Resource                  | URI                       | Description                                                                                                                                     |
| :------------------------ | :------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Git Working Directory** | `git://working-directory` | Provides the current session working directory for git operations. This is the directory set via `git_set_working_dir` and used as the default. |

## 🎯 Prompts Overview

The server provides structured prompt templates that guide AI agents through complex workflows:

| Prompt          | Description                                                                                                                                | Parameters                                                                 |
| :-------------- | :----------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------- |
| **Git Wrap-up** | A systematic workflow protocol for completing git sessions. Guides agents through reviewing, documenting, committing, and tagging changes. | `changelogPath`, `skipDocumentation`, `createTag`, and `updateAgentFiles`. |

## 🚀 Getting Started

### Runtime Compatibility

This server works with **both Bun and Node.js runtimes**:

| Runtime     | Command                         | Minimum Version | Notes                                    |
| ----------- | ------------------------------- | --------------- | ---------------------------------------- |
| **Bun**     | `bunx git-mcp-server@latest`    | ≥ 1.2.0         | Native Bun runtime (optimal performance) |
| **Node.js** | `npx git-mcp-server@latest`     | ≥ 20.0.0        | Via npx/bunx (universal compatibility)   |

The server automatically detects the runtime and uses the appropriate process spawning method for git operations.

### MCP Client Settings/Configuration

Add the following to your MCP Client configuration file (e.g., `cline_mcp_settings.json`). Clients have different ways to configure servers, so refer to your client's documentation for specifics.

**Be sure to update environment variables as needed (especially your Git information!)**

#### Using Bun (bunx)

```json
{
  "mcpServers": {
    "git-mcp-server": {
      "type": "stdio",
      "command": "bunx",
      "args": ["git-mcp-server@latest"],
      "env": {
        "MCP_TRANSPORT_TYPE": "stdio",
        "MCP_LOG_LEVEL": "info",
        "GIT_BASE_DIR": "~/Developer/",
        "LOGS_DIR": "~/Developer/logs/git-mcp-server/",
        "GIT_USERNAME": "your-username",
        "GIT_EMAIL": "your-email@example.com",
        "GIT_SIGN_COMMITS": "false"
      }
    }
  }
}
```

#### Using Node.js (npx)

```json
{
  "mcpServers": {
    "git-mcp-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["git-mcp-server@latest"],
      "env": {
        "MCP_TRANSPORT_TYPE": "stdio",
        "MCP_LOG_LEVEL": "info",
        "GIT_BASE_DIR": "~/Developer/",
        "LOGS_DIR": "~/Developer/logs/git-mcp-server/",
        "GIT_USERNAME": "your-username",
        "GIT_EMAIL": "your-email@example.com",
        "GIT_SIGN_COMMITS": "false"
      }
    }
  }
}
```

#### Streamable HTTP Configuration

```bash
MCP_TRANSPORT_TYPE=http
MCP_HTTP_PORT=3015
```

Important: when running in STDIO mode (or HTTP mode launched without a TTY), the server disables ANSI color output by setting NO_COLOR=1 and FORCE_COLOR=0 to ensure clean MCP client streams. You generally do not need to set these manually.

## ✨ Server Features

This server provides a comprehensive feature set:

- **Declarative Tools**: Define agent capabilities in single, self-contained files. The framework handles registration, validation, and execution.
- **Robust Error Handling**: A unified `McpError` system ensures consistent, structured error responses.
- **Pluggable Authentication**: Secure your server with zero-fuss support for `none`, `jwt`, or `oauth` modes.
- **Abstracted Storage**: Swap storage backends (`in-memory`, `filesystem`, `Supabase`, `Cloudflare KV/R2`) without changing business logic.
- **Full-Stack Observability**: Deep insights with structured logging (Pino) and optional, auto-instrumented OpenTelemetry for traces and metrics.
- **Dependency Injection**: Built with `tsyringe` for a clean, decoupled, and testable architecture.
- **Edge-Ready Architecture**: Built on an edge-compatible framework that runs seamlessly on local machines or Cloudflare Workers. _Note: Current git operations use the CLI provider which requires local git installation. Edge deployment support is planned through the isomorphic-git provider integration._

Plus, specialized features for **Git integration**:

- **Cross-Runtime Compatibility**: Works seamlessly with both Bun and Node.js runtimes. Automatically detects the runtime and uses optimal process spawning (Bun.spawn in Bun, child_process.spawn in Node.js).
- **Provider-Based Architecture**: Pluggable git provider system with current CLI implementation and planned isomorphic-git provider for edge deployment.
- **Optimized Git Execution**: Direct git CLI interaction with cross-runtime support for high-performance process management, streaming I/O, and timeout handling (current CLI provider).
- **Comprehensive Coverage**: 27 tools covering all essential Git operations from init to push.
- **Working Directory Management**: Session-specific directory context for multi-repo workflows.
- **Configurable Git Identity**: Override author/committer information via environment variables with automatic fallback to global git config.
- **Safety Features**: Explicit confirmations for destructive operations like `git clean` and `git_reset --hard`.
- **Commit