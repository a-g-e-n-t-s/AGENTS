/**
 * docs-reindex tool — Full documentation reindexing pipeline.
 *
 * Pipeline: crawl pages → delegate chunking to graph-index → create edges.
 *
 * Uses ability-graph's graph-index tool for chunk+embed+store (consolidation),
 * then creates NextSection and References edges for graph traversal.
 */

import { KadiClient, z } from '@kadi.build/core';

import type { DocsConfig } from '../lib/config.js';
import type { SignalAbilities } from '../lib/graph-types.js';
import {
  type PageDocument,
  splitIntoPages,
  parseLlmsTxt,
} from '../lib/crawler.js';
import { extractCrossDocReferences } from '../lib/references.js';

export function registerReindexTool(
  client: KadiClient,
  config: DocsConfig,
  abilities: SignalAbilities,
): void {

  client.registerTool(
    {
      name: 'docs-reindex',
      description:
        'Reindex documentation into the graph database. Crawls pages, chunks by markdown headings, ' +
        'extracts entities/topics, generates embeddings, and creates DocNode vertices with ' +
        'NextSection and References edges. Uses graph-batch-store for bulk ingestion.',
      input: z.object({
        pages: z.array(z.object({
          title: z.string().describe('Page title'),
          slug: z.string().describe('URL slug for identification'),
          pageUrl: z.string().describe('Full URL of the page'),
          source: z.string().optional().describe('Source identifier'),
          content: z.string().describe('Raw markdown content of the page'),
        })).optional().describe('Pre-loaded page documents to index'),
        llmsContent: z.string().optional()
          .describe('Raw llms-guides.txt or llms-api.txt content to split and index'),
        llmsTxt: z.string().optional()
          .describe('Raw llms.txt content for title→URL mapping'),
        collection: z.string().optional()
          .describe('Target collection name (default: from config)'),
        clearExisting: z.boolean().optional()
          .describe('Clear existing DocNodes in collection before indexing (default: true)'),
        background: z.boolean().optional()
          .describe('Run as background job (default: false for inline processing)'),
        skipExtraction: z.boolean().optional()
          .describe('Skip LLM topic/entity extraction (default: false)'),
      }),
    },
    async (input) => {
      const startTime = Date.now();
      const collection = input.collection ?? config.defaultCollection;

      try {
        // ── Step 1: Resolve pages ──────────────────────────────────────

        let pages: PageDocument[] = [];
        console.error(`[docs-reindex] Step 1: Resolving pages…`);

        if (input.pages && input.pages.length > 0) {
          pages = input.pages.map((p) => ({
            title: p.title,
            slug: p.slug,
            pageUrl: p.pageUrl,
            source: p.source ?? `docs/${p.slug}`,
            content: p.content,
          }));
        } else if (input.llmsContent) {
          const titleUrlMap = input.llmsTxt
            ? parseLlmsTxt(input.llmsTxt)
            : new Map<string, string>();
          pages = splitIntoPages(input.llmsContent, titleUrlMap, config.domain, 'guides');
        }

        if (pages.length === 0) {
          return {
            success: false,
            error: 'No pages to index. Provide either `pages` or `llmsContent`.',
            tool: 'docs-reindex',
          };
        }

        console.error(`[docs-reindex] Step 1 done: ${pages.length} pages resolved`);

        // ── Step 2: Clear existing DocNodes ────────────────────────────
        console.error(`[docs-reindex] Step 2: Clearing existing DocNodes (clearExisting=${input.clearExisting !== false})…`);

        if (input.clearExisting !== false) {
          try {
            await abilities.invoke('graph-command', {
              database: config.database,
              command: `DELETE VERTEX DocNode WHERE collection = '${escapeSimple(collection)}'`,
            });
          } catch {
            // May fail if collection is empty or type doesn't exist yet — safe to ignore
          }
        }

        // ── Step 3: Index pages via graph-index ──────────────────────────
        //
        // Delegates chunking + embedding + storage to ability-graph's graph-index tool.
        // Returns per-page chunk RIDs for edge creation.

        console.error(`[docs-reindex] Step 3: Indexing ${pages.length} pages via graph-index…`);

        const pageChunkRids = new Map<string, string[]>();
        let totalChunks = 0;

        for (const page of pages) {
          const indexResult = await abilities.invoke<{
            success: boolean;
            indexed?: number;
            chunks?: Array<{ rid: string; chunkIndex: number; tokens: number }>;
            error?: string;
          }>('graph-index', {
            content: page.content,
            vertexType: 'DocNode',
            strategy: 'markdown-headers',
            maxTokens: config.maxTokens,
            database: config.database,
            source: page.source,
            collection,
            properties: {
              title: page.title,
              slug: page.slug,
              pageUrl: page.pageUrl,
              indexedAt: new Date().toISOString(),
            },
          });

          if (indexResult.success && indexResult.chunks) {
            const rids = indexResult.chunks
              .sort((a, b) => a.chunkIndex - b.chunkIndex)
              .map(c => c.rid);
            pageChunkRids.set(page.slug, rids);
            totalChunks += indexResult.indexed ?? 0;
          } else {
            console.warn(`[docs-reindex] Failed to index page "${page.slug}": ${indexResult.error ?? 'unknown'}`);
          }
        }

        console.error(`[docs-reindex] Step 3 done: ${totalChunks} chunks across ${pages.length} pages`);

        if (totalChunks === 0) {
          return {
            success: true,
            stats: { docNodes: 0, pages: pages.length, chunks: 0 },
            durationMs: Date.now() - startTime,
          };
        }

        // ── Step 4: Create NextSection edges ──────────────────────────────

        console.error(`[docs-reindex] Step 4: Creating NextSection edges…`);
        let nextSectionCreated = 0;

        for (const [, rids] of pageChunkRids.entries()) {
          for (let i = 0; i < rids.length - 1; i++) {
            try {
              await abilities.invoke('graph-command', {
                database: config.database,
                command: `CREATE EDGE NextSection FROM ${rids[i]} TO ${rids[i + 1]}`,
              });
              nextSectionCreated++;
            } catch {
              // Non-fatal
            }
          }
        }

        console.error(`[docs-reindex] Step 4 done: ${nextSectionCreated} NextSection edges`);

        // ── Step 5: Create References edges for cross-doc links ───────

        console.error(`[docs-reindex] Step 5: Creating References edges for cross-doc links…`);
        const knownSlugs = new Set(pages.map((p) => p.slug));
        let referencesCreated = 0;

        for (const page of pages) {
          const refs = extractCrossDocReferences(page.content, page.slug, knownSlugs);

          for (const ref of refs) {
            if (!ref.resolved) continue;

            try {
              // Get first chunk RID for source and target pages
              const sourceRids = pageChunkRids.get(page.slug);
              const targetRids = pageChunkRids.get(ref.targetSlug!);

              if (!sourceRids?.[0] || !targetRids?.[0]) continue;

              await abilities.invoke('graph-command', {
                database: config.database,
                command: `CREATE EDGE References FROM ${sourceRids[0]} TO ${targetRids[0]} SET linkText = '${escapeSimple(ref.linkText)}', sourceSlug = '${escapeSimple(page.slug)}'`,
              });
              referencesCreated++;
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              console.warn(`[docs-reindex] References edge failed: ${msg}`);
            }
          }
        }

        console.error(`[docs-reindex] Step 5 done: ${referencesCreated} References edges`);
        console.error(`[docs-reindex] Complete: ${totalChunks} chunks, ${nextSectionCreated} NextSection, ${referencesCreated} References (${Date.now() - startTime}ms)`);

        return {
          success: true,
          stats: {
            pages: pages.length,
            chunks: totalChunks,
            nextSectionEdges: nextSectionCreated,
            referencesEdges: referencesCreated,
          },
          collection,
          durationMs: Date.now() - startTime,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        console.error(`[docs-reindex] CAUGHT ERROR: ${message}`);
        if (stack) console.error(`[docs-reindex] Stack: ${stack}`);
        return {
          success: false,
          error: `[docs-reindex] ${message}`,
          tool: 'docs-reindex',
          durationMs: Date.now() - startTime,
        };
      }
    },
  );
}

/** Simple SQL string escape (single quotes). */
function escapeSimple(str: string): string {
  return str.replace(/'/g, "\\'");
}
