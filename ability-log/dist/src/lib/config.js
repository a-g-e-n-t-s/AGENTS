import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
const TAG = '[ability-log:config]';
const CONFIG_FILENAME = 'config.toml';
function findConfigFile(startDir = process.cwd()) {
    let dir = startDir;
    while (true) {
        const candidate = join(dir, CONFIG_FILENAME);
        if (existsSync(candidate))
            return candidate;
        const parent = dirname(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return null;
}
function parseSimpleToml(content) {
    const result = {};
    let currentSection = '';
    for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#'))
            continue;
        const sectionMatch = line.match(/^\[([a-zA-Z0-9._-]+)\]$/);
        if (sectionMatch) {
            currentSection = sectionMatch[1];
            continue;
        }
        const kvMatch = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.+)$/);
        if (!kvMatch)
            continue;
        const key = kvMatch[1];
        const rawValue = kvMatch[2].trim();
        const fullKey = currentSection ? `${currentSection}.${key}` : key;
        result[fullKey] = parseTomlValue(rawValue);
    }
    return result;
}
function parseTomlValue(raw) {
    if (raw === 'true')
        return true;
    if (raw === 'false')
        return false;
    if (/^-?\d+(\.\d+)?$/.test(raw))
        return Number(raw);
    if ((raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))) {
        return raw.slice(1, -1);
    }
    return raw;
}
export function loadArcadeLogConfig() {
    const file = loadConfigSection();
    const configPath = findConfigFile();
    const host = process.env.ARCADE_HOST ?? file.host;
    const port = Number(process.env.ARCADE_PORT ?? file.port ?? 2480);
    const protocol = process.env.ARCADE_PROTOCOL
        ?? file.protocol
        ?? (port === 443 ? 'https' : 'http');
    const database = process.env.ARCADE_DATABASE ?? file.database ?? 'agents_logs';
    const username = process.env.ARCADE_USERNAME;
    const password = process.env.ARCADE_PASSWORD;
    const missing = [];
    if (!host)
        missing.push('ARCADE_HOST (env or [arcadedb] HOST in config.toml)');
    if (!username)
        missing.push('ARCADE_USERNAME (env, set by secret-ability arcadedb vault)');
    if (!password)
        missing.push('ARCADE_PASSWORD (env, set by secret-ability arcadedb vault)');
    if (missing.length > 0) {
        const source = configPath ? `config.toml: ${configPath}` : 'no config.toml found';
        const msg = `${TAG} Missing required ArcadeDB config:\n  - ${missing.join('\n  - ')}\n  (${source})`;
        console.error(msg);
        throw new Error(msg);
    }
    if (configPath) {
        console.log(`${TAG} Loaded settings from ${configPath}`);
    }
    return {
        host: String(host),
        port,
        protocol: String(protocol),
        username: username,
        password: password,
        database: String(database),
    };
}
function loadConfigSection() {
    const configPath = findConfigFile();
    if (!configPath)
        return {};
    try {
        const content = readFileSync(configPath, 'utf-8');
        const parsed = parseSimpleToml(content);
        const section = {};
        for (const [key, value] of Object.entries(parsed)) {
            if (key.startsWith('arcadedb.')) {
                section[key.slice('arcadedb.'.length)] = value;
            }
        }
        return section;
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`${TAG} Failed to parse ${configPath}: ${msg}`);
        return {};
    }
}
//# sourceMappingURL=config.js.map