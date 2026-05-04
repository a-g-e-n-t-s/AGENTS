export class ArcadeClient {
    baseUrl;
    authHeader;
    database;
    constructor(config) {
        const portSuffix = config.port === 443 ? '' : `:${config.port}`;
        this.baseUrl = `${config.protocol}://${config.host}${portSuffix}`;
        this.authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');
        this.database = config.database;
    }
    async isReady() {
        try {
            const res = await fetch(`${this.baseUrl}/api/v1/ready`, {
                headers: { Authorization: this.authHeader },
            });
            return res.status === 204;
        }
        catch {
            return false;
        }
    }
    async query(sql, params) {
        return this.post(`/api/v1/query/${encodeURIComponent(this.database)}`, {
            language: 'sql',
            command: sql,
            ...(params ? { params } : {}),
        });
    }
    async command(sql, params) {
        return this.post(`/api/v1/command/${encodeURIComponent(this.database)}`, {
            language: 'sql',
            command: sql,
            ...(params ? { params } : {}),
        });
    }
    async ensureDatabase() {
        try {
            const res = await fetch(`${this.baseUrl}/api/v1/query/${encodeURIComponent(this.database)}`, {
                method: 'POST',
                headers: {
                    Authorization: this.authHeader,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ language: 'sql', command: 'SELECT 1' }),
            });
            if (res.ok)
                return true;
            const createRes = await fetch(`${this.baseUrl}/api/v1/server`, {
                method: 'POST',
                headers: {
                    Authorization: this.authHeader,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    command: `CREATE DATABASE ${this.database}`,
                }),
            });
            return createRes.ok;
        }
        catch {
            return false;
        }
    }
    async post(path, body) {
        try {
            const res = await fetch(`${this.baseUrl}${path}`, {
                method: 'POST',
                headers: {
                    Authorization: this.authHeader,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const text = await res.text();
                return { success: false, error: `HTTP ${res.status}: ${text}` };
            }
            const data = (await res.json());
            const result = data.result ?? [];
            return { success: true, result, count: result.length };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { success: false, error: msg };
        }
    }
}
//# sourceMappingURL=arcade-client.js.map