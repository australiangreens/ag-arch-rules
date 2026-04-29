import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

// Matches: export const handler, export async function handler, export function handler
const HANDLER_EXPORT_RE = /export\s+(?:const\s+handler|async\s+function\s+handler|function\s+handler)\b/;
// Matches: export { handler } or export { handler as default }
const HANDLER_REEXPORT_RE = /export\s*\{[^}]*\bhandler\b[^}]*\}/;

export async function requireLambdaHandlerExport(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const lambdaDir = path.resolve(config.root, 'lambda');
  if (!fs.existsSync(lambdaDir)) return [];

  // Only check entry-point files: lambda/*/index.ts and lambda/*.ts (one level deep)
  const directPattern = path.posix.join(lambdaDir.replace(/\\/g, '/'), '*.ts');
  const indexPattern  = path.posix.join(lambdaDir.replace(/\\/g, '/'), '*/index.ts');
  const directFiles   = await findFiles(directPattern);
  const indexFiles    = await findFiles(indexPattern);
  const entryPoints   = [...directFiles, ...indexFiles];

  const violations: Violation[] = [];

  for (const file of entryPoints) {
    const relFile = toRelative(file);
    if (matchesAny(relFile, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    if (!HANDLER_EXPORT_RE.test(content) && !HANDLER_REEXPORT_RE.test(content)) {
      violations.push({
        file: relFile,
        message: 'Lambda entry point must export a handler function — AWS Lambda will silently fail if no handler export is found',
      });
    }
  }

  return violations;
}
