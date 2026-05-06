import type { KadiClient } from '@kadi.build/core';

const AGENT_ID = 'agent-expert';
const RECALL_TIMEOUT_MS = 2000;
const ARCHIVAL_THRESHOLD = 20;

interface MemoryResult {
  content: string;
  score?: number;
  properties?: Record<string, unknown>;
}

interface RecallResponse {
  results: MemoryResult[];
}

export async function recallRelevantContext(
  client: KadiClient,
  question: string,
): Promise<string | null> {
  try {
    const result = await Promise.race([
      client.invokeRemote<RecallResponse>('memory-recall', {
        query: question,
        agent: AGENT_ID,
        limit: 5,
        mode: 'hybrid',
      }),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), RECALL_TIMEOUT_MS),
      ),
    ]);

    if (!result?.results?.length) return null;

    const fragments = result.results
      .filter((r) => r.score && r.score > 0.3)
      .slice(0, 3)
      .map((r) => r.content);

    if (fragments.length === 0) return null;

    return `## Prior Conversations\n${fragments.join('\n---\n')}`;
  } catch {
    return null;
  }
}

export function storeExchange(
  client: KadiClient,
  question: string,
  answer: string,
  conversationId?: string,
): void {
  const content = `Q: ${question}\nA: ${answer.slice(0, 2000)}`;

  client.invokeRemote('memory-store', {
    content,
    agent: AGENT_ID,
    conversationId,
    topics: ['agent-expert-conversation'],
    importance: 0.4,
  }).catch(() => {});
}

export async function archiveIfNeeded(
  client: KadiClient,
  conversationId: string,
  apiKey: string | undefined,
): Promise<void> {
  if (!apiKey) return;

  try {
    const result = await client.invokeRemote<RecallResponse>('memory-recall', {
      query: '*',
      agent: AGENT_ID,
      conversationId,
      limit: ARCHIVAL_THRESHOLD + 5,
      mode: 'keyword',
    });

    if (!result?.results || result.results.length < ARCHIVAL_THRESHOLD) return;

    const oldExchanges = result.results.slice(10);
    const combined = oldExchanges.map((r) => r.content).join('\n\n');

    const summary = await client.invokeRemote<{ choices: Array<{ message: { content: string } }> }>(
      'chat-completion',
      {
        api_key: apiKey,
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: 'Summarize these Q&A exchanges into key facts and insights. Be concise.' },
          { role: 'user', content: combined },
        ],
        max_tokens: 500,
        temperature: 0.2,
      },
    );

    const summaryText = summary?.choices?.[0]?.message?.content;
    if (!summaryText) return;

    await client.invokeRemote('memory-store', {
      content: `[Conversation Summary] ${summaryText}`,
      agent: AGENT_ID,
      conversationId,
      topics: ['agent-expert-conversation', 'summary'],
      importance: 0.7,
      skipReconciliation: true,
    });

    for (const old of oldExchanges) {
      const rid = (old.properties as any)?.['@rid'];
      if (rid) {
        client.invokeRemote('memory-forget', {
          rid,
          confirm: true,
        }).catch(() => {});
      }
    }
  } catch {
    // archival is best-effort
  }
}
