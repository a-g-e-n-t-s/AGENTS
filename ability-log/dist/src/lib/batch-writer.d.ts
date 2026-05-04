import type { ArcadeClient } from './arcade-client.js';
export interface LogEntry {
    agentId: string;
    agentRole: string;
    level: string;
    module: string;
    message: string;
    networkId: string;
    source: string;
    timestamp: string;
}
export interface SystemEvent {
    type: string;
    agentId?: string;
    data: string;
    timestamp: string;
}
export declare class BatchWriter {
    private readonly db;
    private logBuffer;
    private eventBuffer;
    private flushTimer;
    private flushing;
    constructor(db: ArcadeClient);
    start(): void;
    stop(): Promise<void>;
    pushLog(entry: LogEntry): void;
    pushEvent(entry: SystemEvent): void;
    private flush;
}
