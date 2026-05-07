# ability-voice

> Voice operations - TTS (Piper), STT (Whisper), wake word detection

## Quick Start

```bash
cd ability-voice
kadi run preflight
kadi run setup
kadi run start
```

## Tools

| Tool / Capability | Description |
|-------------------|-------------|
| transcribe | Real-time or file-based speech-to-text using Whisper |
| synthesize | Generate audio from text via Piper |
| speak | Synthesize and play audio through the system speaker |
| transcribe_file | Transcribe a provided audio file |
| list_voices | List available Piper voices (downloads en_US-lessac-medium during build) |
| start_listening | Start continuous/listen mode (uses LISTEN_MODE env) |
| stop_listening | Stop continuous/listen mode |
| listener_status | Query current listener status |

*(Run `kadi run start` and check the broker for registered tools and their runtime status.)*

## Configuration

### agent.json

| Field | Value |
|-------|-------|
| **Name** | ability-voice |
| **Version** | 1.0.0 |
| **Type** | ability |
| **Description** | Voice operations - TTS (Piper), STT (Whisper), wake word detection, optimized for NVIDIA Jetson |
| **Entrypoint** | `src/ability_voice/__main__.py` |
| **Networks** | `["voice"]` |
| **Brokers** | `{"remote": "wss://broker.dadavidtseng.com/kadi"}` |

#### Available scripts (from agent.json)
| Script | Command |
|--------|---------|
| preflight | `python3 -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"` || `python3 --version` |
| setup | `python3 -m venv venv && ./venv/bin/pip install --upgrade pip && ./venv/bin/pip install -r requirements.txt` |
| start | `./venv/bin/python3 -m ability_voice` |
| listen | `LISTEN_MODE=1 ./venv/bin/python3 -m ability_voice` |
| standalone | `STANDALONE=1 ./venv/bin/python3 -m ability_voice` |
| test | `./venv/bin/python3 -m pytest tests/` |
| clean | `rm -rf venv .venv __pycache__ src/ability_voice/__pycache__` |

### config.toml

Default configuration options (config.toml):

- broker.local
  - URL: "ws://localhost:8080/kadi"
  - NETWORKS: ["voice"]
  - MODE: "native"
- broker.remote
  - URL: "wss://broker.dadavidtseng.com/kadi"
  - NETWORKS: ["voice"]
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

Note: Deploy configurations may set environment variables like WHISPER_MODEL (e.g. `base.en`) or LISTEN_MODE; see the build/deploy section below.

## Architecture

- Two build targets are provided:
  - default (Jetson-optimized): base image nvcr.io/nvidia/l4t-pytorch:r36.2.0-pth2.3-py3 for NVIDIA Jetson devices. Installs system audio dependencies and downloads the Piper voice files into `/root/.local/share/piper/voices`.
  - x86: uses pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime and performs similar setup for x86 CUDA hosts.
- During image build the Piper voice (en_US-lessac-medium.onnx and its metadata) is downloaded from Hugging Face into the container image.
- Deploy presets:
  - local: runs the Jetson-optimized image with NVIDIA container environment variables set (NVIDIA_VISIBLE_DEVICES, NVIDIA_DRIVER_CAPABILITIES) and sets KADI_BROKER_URL, KADI_AGENT_NAME, and WHISPER_MODEL.
  - local-listen: same as local but includes LISTEN_MODE=1 to start in listening mode.
- Metadata exposes capabilities such as transcribe, synthesize, speak, transcribe_file, list_voices, start_listening, stop_listening, and listener_status.
- The agent is designed to use GPU acceleration when available (preflight checks for CUDA via torch).

## Development

```bash
kadi run setup          # creates a venv and installs python requirements
kadi run start          # starts the ability (./venv/bin/python3 -m ability_voice)
```

Run in stdio mode (local development / testing):

```bash
kadi run listen         # LISTEN_MODE=1, starts in listening mode
kadi run standalone     # STANDALONE=1, runs without broker (if supported)
```

Run tests:

```bash
kadi run test
```

Run connected to the broker (use the configured KADI_BROKER_URL):

```bash
kadi run start
```

Cleanup:

```bash
kadi run clean
```

## Notes

- The build images install system dependencies such as portaudio, ffmpeg, espeak-ng, and others required for audio I/O and TTS.
- The Jetson image uses NVIDIA's L4T PyTorch container — ensure NVIDIA container tooling is available when running the container on Jetson devices.
- If you need a different Whisper model, set WHISPER_MODEL in the environment (deploy presets set this to `base.en`).