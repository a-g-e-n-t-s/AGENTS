# AGENTS Tooling Strategy

## Design Principles

1. **Per-language best-in-class** — no single tool covers all languages well
2. **Orchestration layer** — one command to format/lint everything regardless of language
3. **Shared config** — DRY across 35+ repos via published base configs
4. **Zero-dep where possible** — prefer single-binary tools over npm-installed plugin chains

## Current Languages & Planned Expansion

| Language   | Current Repos             | Formatter           | Linter              |
|------------|---------------------------|---------------------|---------------------|
| TypeScript | agents, abilities, MCP    | Biome               | Biome               |
| Python     | template-agent-python     | Ruff                | Ruff                |
| C++        | DaemonAgent (Engine)      | clang-format        | clang-tidy          |
| Rust       | (planned)                 | rustfmt             | clippy              |
| Go         | (planned)                 | gofmt               | golangci-lint       |
| Java       | (planned)                 | google-java-format  | checkstyle/spotbugs |

## Recommended Stack

### Format + Lint (TypeScript)

**Biome** — replaces eslint + prettier in one binary.

- Zero npm dependencies
- ~50ms for full lint+format (vs ~2s for eslint)
- Stable config format (no eslint 8→9 migration pain)
- One `biome.json` shared across all TS repos

### Multi-language Orchestration

**treefmt** — dispatches the correct formatter per file extension.

```toml
# treefmt.toml (at AGENTS root)
[formatter.typescript]
command = "biome"
options = ["format", "--write"]
includes = ["*.ts", "*.tsx"]

[formatter.python]
command = "ruff"
options = ["format"]
includes = ["*.py"]

[formatter.rust]
command = "rustfmt"
includes = ["*.rs"]

[formatter.go]
command = "gofmt"
options = ["-w"]
includes = ["*.go"]

[formatter.cpp]
command = "clang-format"
options = ["-i"]
includes = ["*.cpp", "*.h"]

[formatter.java]
command = "google-java-format"
options = ["--replace"]
includes = ["*.java"]
```

### Git Hooks

**lefthook** — lightweight (single binary), runs lint/format on staged files.

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    biome:
      glob: "*.{ts,tsx,js}"
      run: npx biome check --write {staged_files}
      stage_fixed: true
    ruff:
      glob: "*.py"
      run: ruff check --fix {staged_files}
      stage_fixed: true
```

### Build

| Use case              | Tool   | Why                                    |
|-----------------------|--------|----------------------------------------|
| Libraries (agents-library) | tsc    | Need .d.ts declarations                |
| Deployed packages     | tsup   | Bundled output, tree-shaking, faster   |

### Dependency Health (across 35 repos)

| Tool     | Purpose                                       |
|----------|-----------------------------------------------|
| syncpack | Enforce consistent dep versions across repos  |
| knip     | Find unused files, exports, deps              |

### Shared Config

- `@a-g-e-n-t-s/tsconfig` — base tsconfig all TS repos extend
- `biome.json` — single config at root or published package
- `.clang-format` — shared C++ style

## Migration Path

1. **Now** — Biome in template-agent-typescript as pilot
2. **Next** — Roll Biome + shared tsconfig to all TS repos
3. **Later** — Add treefmt + lefthook when non-TS languages land
4. **Eventually** — syncpack CI check across all repos

## Why Not ESLint?

- 60+ transitive deps with recurring vulnerabilities
- Breaking config changes (eslint 8→9 flat config migration)
- Separate formatter (prettier) required
- Slower (~40x for this codebase)
- Plugin ecosystem fragmentation

ESLint's type-aware rules (no-floating-promises, await-thenable) are the one advantage.
Mitigation: `tsc --noEmit` with strict mode catches most of the same issues.

## Alternatives Considered

| Tool    | Verdict                                                        |
|---------|----------------------------------------------------------------|
| oxlint  | Fast linter but no formatter — need dprint or prettier anyway  |
| dprint  | Good formatter but lint still needs separate tool              |
| Rome    | Dead (became Biome)                                            |
| prettier| Slower than Biome, config drift with eslint                    |
