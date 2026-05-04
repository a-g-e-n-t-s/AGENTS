const FLUSH_INTERVAL_MS = 5_000;
const FLUSH_THRESHOLD = 50;
export class BatchWriter {
    db;
    logBuffer = [];
    eventBuffer = [];
    flushTimer = null;
    flushing = false;
    constructor(db) {
        this.db = db;
    }
    start() {
        if (this.flushTimer)
            return;
        this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
    }
    async stop() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        await this.flush();
    }
    pushLog(entry) {
        this.logBuffer.push(entry);
        if (this.logBuffer.length + this.eventBuffer.length >= FLUSH_THRESHOLD) {
            this.flush();
        }
    }
    pushEvent(entry) {
        this.eventBuffer.push(entry);
        if (this.logBuffer.length + this.eventBuffer.length >= FLUSH_THRESHOLD) {
            this.flush();
        }
    }
    async flush() {
        if (this.flushing)
            return;
        if (this.logBuffer.length === 0 && this.eventBuffer.length === 0)
            return;
        this.flushing = true;
        const logs = this.logBuffer.splice(0);
        const events = this.eventBuffer.splice(0);
        try {
            for (const entry of logs) {
                const sql = `INSERT INTO LogEntry SET agentId = :agentId, agentRole = :agentRole, level = :level, module = :module, message = :message, networkId = :networkId, source = :source, timestamp = :timestamp`;
                await this.db.command(sql, {
                    agentId: entry.agentId,
                    agentRole: entry.agentRole,
                    level: entry.level,
                    module: entry.module,
                    message: entry.message,
                    networkId: entry.networkId,
                    source: entry.source,
                    timestamp: entry.timestamp,
                });
            }
            for (const entry of events) {
                const sql = `INSERT INTO SystemEvent SET type = :type, agentId = :agentId, data = :data, timestamp = :timestamp`;
                await this.db.command(sql, {
                    type: entry.type,
                    agentId: entry.agentId ?? '',
                    data: entry.data,
                    timestamp: entry.timestamp,
                });
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[ability-log] Flush failed (${logs.length} logs, ${events.length} events): ${msg}`);
        }
        finally {
            this.flushing = false;
        }
    }
}
//# sourceMappingURL=batch-writer.js.map