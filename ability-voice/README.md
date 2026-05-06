# ability-voice

> Voice operations - TTS (Piper), STT (Whisper), wake word detection

## Quick Start

```bash
cd ability-voice
npm install
kadi run preflight
kadi run setup
kadi run start
```

## Tools

| Tool | Description |
|------|-------------|
| *(Run `kadi run start` and check broker for registered tools)* | |

## Configuration

### agent.json

| Field | Value |
|-------|-------|
| **Name** | ability-voice |
| **Version** | 1.0.0 |
| **Type** | ability |
| **Description** | Voice operations - TTS (Piper), STT (Whisper), wake word detection |
| **Entrypoint** | `src/ability_voice/__main__.py` |

#### Available scripts (from agent.json)
| Script | Command |
|--------|---------|
| preflight | `python --version` |
| setup | `uv sync` |
| start | `uv run python -m ability_voice` |
| serve | `KADI_MODE=stdio uv run python -m ability_voice` |
| serve:broker | `KADI_MODE=broker uv run python -m ability_voice` |
| clean | `rm -rf .venv __pycache__ src/ability_voice/__pycache__` |

### config.toml

Default configuration options (config.toml):

- broker.local
  - URL: "ws://localhost:8080/kadi"
  - NETWORKS: ["voice"]
  - MODE: "native"
- whisper
  - MODEL: "base"
- piper
  - VOICE: "en_US-lessac-medium"
- wake
  - WORD: "hey kadi"
  - VAD_AGGRESSIVENESS: 3
  - SILENCE_TIMEOUT_MS: 1500
  - MAX_RECORDING_SECONDS: 30

Adjust these values in your local config.toml to match your environment and desired behavior.

## Architecture

<!-- TODO: Add Architecture content -->

## Development

```bash
npm install
kadi run setup          # runs `uv sync` to prepare the environment
kadi run start          # starts the ability (uses `uv run python -m ability_voice`)
```

Run in stdio mode (local development / testing):

```bash
kadi run serve          # KADI_MODE=stdio
```

Run connected to the broker:

```bash
kadi run serve:broker   # KADI_MODE=broker
```

Cleanup:

```bash
kadi run clean
```

---

---

---