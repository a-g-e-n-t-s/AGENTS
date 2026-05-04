const SCHEMA_COMMANDS = [
    'CREATE VERTEX TYPE LogEntry IF NOT EXISTS',
    'CREATE PROPERTY LogEntry.agentId IF NOT EXISTS STRING',
    'CREATE PROPERTY LogEntry.agentRole IF NOT EXISTS STRING',
    'CREATE PROPERTY LogEntry.level IF NOT EXISTS STRING',
    'CREATE PROPERTY LogEntry.module IF NOT EXISTS STRING',
    'CREATE PROPERTY LogEntry.message IF NOT EXISTS STRING',
    'CREATE PROPERTY LogEntry.networkId IF NOT EXISTS STRING',
    'CREATE PROPERTY LogEntry.timestamp IF NOT EXISTS STRING',
    'CREATE PROPERTY LogEntry.source IF NOT EXISTS STRING',
    'CREATE VERTEX TYPE SystemEvent IF NOT EXISTS',
    'CREATE PROPERTY SystemEvent.type IF NOT EXISTS STRING',
    'CREATE PROPERTY SystemEvent.agentId IF NOT EXISTS STRING',
    'CREATE PROPERTY SystemEvent.data IF NOT EXISTS STRING',
    'CREATE PROPERTY SystemEvent.timestamp IF NOT EXISTS STRING',
];
const INDEX_COMMANDS = [
    'CREATE INDEX ON LogEntry(agentId, timestamp) NOTUNIQUE',
    'CREATE INDEX ON LogEntry(timestamp) NOTUNIQUE',
    'CREATE INDEX ON SystemEvent(timestamp) NOTUNIQUE',
    'CREATE INDEX ON SystemEvent(type, timestamp) NOTUNIQUE',
];
export async function ensureSchema(db) {
    const dbReady = await db.ensureDatabase();
    if (!dbReady)
        return false;
    for (const sql of SCHEMA_COMMANDS) {
        const res = await db.command(sql);
        if (!res.success) {
            console.error(`[ability-log] Schema command failed: ${sql} — ${res.error}`);
            return false;
        }
    }
    for (const sql of INDEX_COMMANDS) {
        await db.command(sql).catch(() => { });
    }
    return true;
}
//# sourceMappingURL=schema.js.map