/**
 * Configuration loader for ability-docs-memory.
 *
 * Resolution order (highest wins):
 *   1. Environment variables  (DOCS_DATABASE, MODEL_MANAGER_API_KEY, ...)
 *   2. Vault "model-manager"  (MODEL_MANAGER_BASE_URL, MODEL_MANAGER_API_KEY)
 *   3. `config.toml` file     (walk-up from CWD — [docs] section)
 *   4. Built-in defaults
 */

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

let configLogged = false;

export type Transport = 'broker' | 'api';

export interface DocsConfig {
  database: string;
  defaultCollection: string;
  embeddingModel: string;
  extractionModel: string;
  maxTokens: number;
  baseUrl: string;
  domain: string;
  apiKey?: string;
  apiUrl?: string;
  embeddingTransport: Transport;
  chatTransport: Transport;
}

export const VAULT_NAME = 'model-manager';
export const VAULT_KEYS = ['MODEL_MANAGER_BASE_URL', 'MODEL_MANAGER_API_KEY'] as const;

// ── Lightweight TOML parser ───────────────────────────────────────────

function parseTomlValue(raw: string): unknown {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
  if (/^-?\d+\.\d+$/.test(raw)) return parseFloat(raw);
  if (raw.startsWith('"') && raw.endsWith('"')) return raw.slice(1, -1);
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1);
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return raw.slice(1, -1).split(',').map(s => parseTomlValue(s.trim()));
  }
  return raw;
}

function parseSimpleToml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentSection = '';

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const sectionMatch = line.match(/^\[([a-zA-Z0-9._-]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }

    const kvMatch = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.+)$/);
    if (!kvMatch) continue;

    const key = kvMatch[1];
    const rawValue = kvMatch[2].trim();
    const fullKey = currentSection ? `${currentSection}.${key}` : key;
    result[fullKey] = parseTomlValue(rawValue);
  }

  return result;
}

// ── Config file discovery ─────────────────────────────────────────────

function findConfigFile(filename = 'config.toml'): string | null {
  let dir = process.cwd();
  while (true) {
    const candidate = join(dir, filename);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function loadConfigSection(): Record<string, unknown> {
  const configPath = findConfigFile();
  if (!configPath) {
    if (!configLogged) {
      configLogged = true;
      console.warn('[ability-docs-memory] No config.toml found — using env vars / vault only');
    }
    return {};
  }

  if (!configLogged) {
    configLogged = true;
    console.log(`[ability-docs-memory] config.toml loaded from ${configPath}`);
  }

  const content = readFileSync(configPath, 'utf8');
  const flat = parseSimpleToml(content);

  const section: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (key.startsWith('docs.')) {
      section[key.slice('docs.'.length)] = value;
    }
  }
  return section;
}

// ── Vault loading ─────────────────────────────────────────────────────

export async function loadFromVault(client: any): Promise<Record<string, string>> {
  const credentials: Record<string, string> = {};

  try {
    const secrets = await client.loadNative('secret-ability');

    for (const key of VAULT_KEYS) {
      try {
        const result = await secrets.invoke('get', { vault: VAULT_NAME, key });
        if (result?.value) {
          credentials[key] = result.value;
        }
      } catch {
        // Key not present
      }
    }

    // Normalize to internal key names
    if (credentials['MODEL_MANAGER_BASE_URL']) {
      credentials['MEMORY_API_URL'] = credentials['MODEL_MANAGER_BASE_URL'];
    }
    if (credentials['MODEL_MANAGER_API_KEY']) {
      credentials['MEMORY_API_KEY'] = credentials['MODEL_MANAGER_API_KEY'];
    }

    await secrets.disconnect();
    const found = Object.keys(credentials).filter(k => VAULT_KEYS.includes(k as any)).length;
    console.log(
      `[ability-docs-memory] Vault "${VAULT_NAME}" loaded — ${found}/${VAULT_KEYS.length} keys found`,
    );
  } catch (err: any) {
    console.warn('[ability-docs-memory] secret-ability not available — using env vars / config only');
    console.warn('[ability-docs-memory] loadNative error:', err?.message ?? err);
  }

  return credentials;
}

// ── Config builder ────────────────────────────────────────────────────

export function loadDocsConfig(): DocsConfig {
  return buildConfig({});
}

export async function loadDocsConfigWithVault(client: any): Promise<DocsConfig> {
  const vaultSecrets = await loadFromVault(client);
  return buildConfig(vaultSecrets);
}

function buildConfig(vault: Record<string, string>): DocsConfig {
  const file = loadConfigSection();

  return {
    database:
      process.env.DOCS_DATABASE ??
      process.env.MEMORY_DATABASE ??
      (file.database as string) ??
      'agents_memory',
    defaultCollection:
      process.env.DOCS_DEFAULT_COLLECTION ??
      (file.default_collection as string) ??
      'agents-docs',
    embeddingModel:
      process.env.DOCS_EMBEDDING_MODEL ??
      (file.embedding_model as string) ??
      'text-embedding-3-small',
    extractionModel:
      process.env.DOCS_EXTRACTION_MODEL ??
      (file.extraction_model as string) ??
      'gpt-5-nano',
    maxTokens:
      Number(process.env.DOCS_MAX_TOKENS) ||
      (file.max_tokens as number) ||
      500,
    baseUrl:
      process.env.DOCS_BASE_URL ??
      (file.base_url as string) ??
      'http://localhost:3333',
    domain:
      process.env.DOCS_DOMAIN ??
      (file.domain as string) ??
      'localhost',
    apiKey:
      process.env.MEMORY_API_KEY ??
      vault['MEMORY_API_KEY'] ??
      undefined,
    apiUrl:
      process.env.MEMORY_API_URL ??
      vault['MEMORY_API_URL'] ??
      undefined,
    embeddingTransport:
      (process.env.DOCS_EMBEDDING_TRANSPORT ??
        (file.embedding_transport as string) ??
        'api') as Transport,
    chatTransport:
      (process.env.DOCS_CHAT_TRANSPORT ??
        (file.chat_transport as string) ??
        'api') as Transport,
  };
}
