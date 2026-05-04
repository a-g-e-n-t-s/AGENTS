/**
 * Directive Loader
 *
 * Loads agent directives (system prompt instructions) from TypeScript files.
 * Directives define agent behavior, mandatory tool usage, and workflow rules.
 *
 * Resolution order:
 *   1. {agentDir}/src/directives/{role}.ts  (role-specific, if role provided)
 *   2. {agentDir}/src/directives/index.ts   (agent-level default)
 *   3. null (no directive — backward compatible)
 *
 * Directive files can export:
 *   - A string (static directive)
 *   - A function (dynamic directive) that receives DirectiveContext and returns string
 *
 * @module directive
 */

import { existsSync } from 'fs';
import { resolve, join, sep } from 'path';

export interface DirectiveContext {
  /** Discovered tool names available to this agent */
  tools: string[];
  /** Active role (for multi-role agents like agent-worker) */
  role?: string;
  /** Agent ID */
  agentId?: string;
}

export type DirectiveExport = string | ((context: DirectiveContext) => string | Promise<string>);

/**
 * Load a directive from the agent's directives directory.
 *
 * Tries role-specific file first ({role}.ts), then falls back to index.ts.
 * Returns null if no directive file exists (backward compatible).
 */
export async function loadDirective(
  agentDir: string,
  context: DirectiveContext
): Promise<string | null> {
  const directivesDir = resolve(agentDir, 'src', 'directives');

  // Try role-specific directive first
  if (context.role) {
    const roleDirective = await tryLoadDirectiveFile(directivesDir, context.role, context);
    if (roleDirective !== null) return roleDirective;
  }

  // Fall back to index directive
  const indexDirective = await tryLoadDirectiveFile(directivesDir, 'index', context);
  if (indexDirective !== null) return indexDirective;

  return null;
}

/**
 * Try to load a directive from a specific file.
 * Checks for both .ts (dev) and .js (dist) extensions.
 */
async function tryLoadDirectiveFile(
  directivesDir: string,
  name: string,
  context: DirectiveContext
): Promise<string | null> {
  // In production, directives are compiled to dist/
  const distDir = directivesDir.replace(
    /[/\\]src[/\\]directives$/,
    `${sep}dist${sep}directives`
  );

  // Try dist/.js first (production), then src/.ts (dev with tsx)
  const candidates = [
    join(distDir, `${name}.js`),
    join(directivesDir, `${name}.ts`),
  ];

  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;

    try {
      const mod = await import(pathToFileUrl(filePath));
      const exported: DirectiveExport = mod.default ?? mod.directive;

      if (typeof exported === 'string') {
        return exported;
      }

      if (typeof exported === 'function') {
        const result = exported(context);
        return result instanceof Promise ? await result : result;
      }

      // Module exists but doesn't export a string or function
      return null;
    } catch (err: any) {
      console.warn(`[directive] Failed to load ${filePath}: ${err.message}`);
      continue;
    }
  }

  return null;
}

/**
 * Convert a file path to a file:// URL for dynamic import on Windows.
 */
function pathToFileUrl(filePath: string): string {
  const resolved = resolve(filePath);
  // On Windows, convert backslashes and add file:/// prefix
  if (process.platform === 'win32') {
    return `file:///${resolved.replace(/\\/g, '/')}`;
  }
  return `file://${resolved}`;
}
