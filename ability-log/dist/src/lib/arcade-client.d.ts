export interface ArcadeClientConfig {
    host: string;
    port: number;
    protocol: string;
    username: string;
    password: string;
    database: string;
}
export interface QueryResult {
    success: boolean;
    result?: unknown[];
    count?: number;
    error?: string;
}
export declare class ArcadeClient {
    private readonly baseUrl;
    private readonly authHeader;
    private readonly database;
    constructor(config: ArcadeClientConfig);
    isReady(): Promise<boolean>;
    query(sql: string, params?: Record<string, unknown>): Promise<QueryResult>;
    command(sql: string, params?: Record<string, unknown>): Promise<QueryResult>;
    ensureDatabase(): Promise<boolean>;
    private post;
}
