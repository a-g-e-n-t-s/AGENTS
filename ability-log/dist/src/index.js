import { KadiClient, z } from '@kadi.build/core';
import { ArcadeClient } from './lib/arcade-client.js';
import { loadArcadeLogConfig } from './lib/config.js';
import { ensureSchema } from './lib/schema.js';
import { BatchWriter } from './lib/batch-writer.js';
const config = loadArcadeLogConfig();
const db = new ArcadeClient(config);
const writer = new BatchWriter(db);
const brokerConfig = {
    url: process.env.KADI_BROKER_URL || 'ws://localhost:8080/kadi',
};
if (process.env.KADI_NETWORK) {
    brokerConfig.networks = [process.env.KADI_NETWORK];
}
const client = new KadiClient({
    name: 'ability-log',
    brokers: { default: brokerConfig },
});
let schemaReady = false;
async function init() {
    const ready = await db.isReady();
    if (!ready) {
        console.error('[ability-log] ArcadeDB not reachable — logging will be unavailable');
        return;
    }
    schemaReady = await ensureSchema(db);
    if (!schemaReady) {
        console.error('[ability-log] Schema initialization failed — logging will be unavailable');
        return;
    }
    writer.start();
    await pruneOlderThan(7);
    console.log('[ability-log] Initialized — schema ready, batch writer started');
}
async function pruneOlderThan(days) {
    let logs = 0;
    let events = 0;
    try {
        const logRes = await db.command(`DELETE FROM LogEntry WHERE timestamp < date('now').modify('-${days}d')`);
        logs = logRes.count ?? 0;
        const eventRes = await db.command(`DELETE FROM SystemEvent WHERE timestamp < date('now').modify('-${days}d')`);
        events = eventRes.count ?? 0;
        if (logs > 0 || events > 0) {
            console.log(`[ability-log] Pruned ${logs} logs + ${events} events older than ${days} days`);
        }
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[ability-log] Prune failed: ${msg}`);
    }
    return { logs, events };
}
client.registerTool({
    name: 'log_write',
    description: 'Insert a log entry into persistent storage (batched internally)',
    input: z.object({
        agentId: z.string().describe('Agent identifier'),
        agentRole: z.string().describe('Agent role'),
        level: z.string().describe('Log level: info, warn, error'),
        module: z.string().describe('Module/tag name'),
        message: z.string().describe('Log message'),
        networkId: z.string().optional().describe('Network the agent is on'),
        source: z.string().optional().describe('Log source identifier'),
        timestamp: z.string().optional().describe('ISO timestamp (defaults to now)'),
    }),
}, async (args) => {
    if (!schemaReady)
        return { success: false, error: 'ArcadeDB not available' };
    writer.pushLog({
        agentId: args.agentId,
        agentRole: args.agentRole,
        level: args.level,
        module: args.module,
        message: args.message,
        networkId: args.networkId ?? 'unknown',
        source: args.source ?? 'agent',
        timestamp: args.timestamp ?? new Date().toISOString(),
    });
    return { success: true };
});
client.registerTool({
    name: 'log_query',
    description: 'Query persisted log entries with optional filters and pagination',
    input: z.object({
        agentId: z.string().optional().describe('Filter by agent ID'),
        level: z.string().optional().describe('Filter by log level'),
        after: z.string().optional().describe('Return entries after this ISO timestamp'),
        before: z.string().optional().describe('Return entries before this ISO timestamp'),
        limit: z.number().optional().describe('Max results (default 100, max 500)'),
    }),
}, async (args) => {
    if (!schemaReady)
        return { success: false, error: 'ArcadeDB not available' };
    const conditions = [];
    const params = {};
    if (args.agentId) {
        conditions.push('agentId = :agentId');
        params.agentId = args.agentId;
    }
    if (args.level) {
        conditions.push('level = :level');
        params.level = args.level;
    }
    if (args.after) {
        conditions.push('timestamp > :after');
        params.after = args.after;
    }
    if (args.before) {
        conditions.push('timestamp < :before');
        params.before = args.before;
    }
    const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.min(args.limit ?? 100, 500);
    const sql = conditions.length > 0
        ? `SELECT FROM LogEntry${where} LIMIT ${limit}`
        : `SELECT FROM LogEntry ORDER BY timestamp DESC LIMIT ${limit}`;
    const result = await db.query(sql, params);
    const entries = result.result ?? [];
    if (conditions.length > 0) {
        entries.sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));
    }
    return {
        success: result.success,
        entries,
        count: result.count ?? 0,
        error: result.error,
    };
});
client.registerTool({
    name: 'event_write',
    description: 'Insert a system event into persistent storage (batched internally)',
    input: z.object({
        type: z.string().describe('Event type (e.g., quest.created, task.assigned)'),
        agentId: z.string().optional().describe('Agent that triggered the event'),
        data: z.string().describe('JSON-stringified event payload'),
        timestamp: z.string().optional().describe('ISO timestamp (defaults to now)'),
    }),
}, async (args) => {
    if (!schemaReady)
        return { success: false, error: 'ArcadeDB not available' };
    writer.pushEvent({
        type: args.type,
        agentId: args.agentId,
        data: args.data,
        timestamp: args.timestamp ?? new Date().toISOString(),
    });
    return { success: true };
});
client.registerTool({
    name: 'event_query',
    description: 'Query persisted system events with optional filters and pagination',
    input: z.object({
        type: z.string().optional().describe('Filter by event type'),
        agentId: z.string().optional().describe('Filter by agent ID'),
        after: z.string().optional().describe('Return events after this ISO timestamp'),
        before: z.string().optional().describe('Return events before this ISO timestamp'),
        limit: z.number().optional().describe('Max results (default 100, max 500)'),
    }),
}, async (args) => {
    if (!schemaReady)
        return { success: false, error: 'ArcadeDB not available' };
    const conditions = [];
    const params = {};
    if (args.type) {
        conditions.push('type = :type');
        params.type = args.type;
    }
    if (args.agentId) {
        conditions.push('agentId = :agentId');
        params.agentId = args.agentId;
    }
    if (args.after) {
        conditions.push('timestamp > :after');
        params.after = args.after;
    }
    if (args.before) {
        conditions.push('timestamp < :before');
        params.before = args.before;
    }
    const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.min(args.limit ?? 100, 500);
    const sql = conditions.length > 0
        ? `SELECT FROM SystemEvent${where} LIMIT ${limit}`
        : `SELECT FROM SystemEvent ORDER BY timestamp DESC LIMIT ${limit}`;
    const result = await db.query(sql, params);
    const events = result.result ?? [];
    if (conditions.length > 0) {
        events.sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));
    }
    return {
        success: result.success,
        events,
        count: result.count ?? 0,
        error: result.error,
    };
});
client.registerTool({
    name: 'log_prune',
    description: 'Delete log entries and system events older than N days',
    input: z.object({
        days: z.number().optional().describe('Delete entries older than this many days (default 7)'),
    }),
}, async (args) => {
    if (!schemaReady)
        return { success: false, error: 'ArcadeDB not available' };
    const days = args.days ?? 7;
    const result = await pruneOlderThan(days);
    return { success: true, ...result };
});
export default client;
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
    const mode = (process.env.KADI_MODE || process.argv[2] || 'stdio');
    if (mode === 'stdio') {
        console.error(`[ability-log] Starting in ${mode} mode...`);
    }
    else {
        console.log(`[ability-log] Starting in ${mode} mode...`);
    }
    init().then(() => {
        client.serve(mode).catch((error) => {
            console.error('[ability-log] Failed to start:', error);
            process.exit(1);
        });
    });
}
else {
    init().catch((err) => {
        console.error('[ability-log] Init failed:', err);
    });
}
//# sourceMappingURL=index.js.map