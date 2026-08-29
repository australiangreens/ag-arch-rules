import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ArchConfig } from '../../types.js';

/**
 * Resolves config.root plus, for each configured sliceDir, one layer root
 * per immediate subdirectory of that sliceDir. Returned roots are kept in
 * the same relative/absolute form as config.root (path.join, not
 * path.resolve) so callers that build CWD-relative glob patterns from
 * config.root continue to do so for slice roots too.
 *
 * Example: config.root = 'src', config.sliceDirs = ['features'], with
 * src/features/{alpha,beta}/ on disk → ['src', 'src/features/alpha', 'src/features/beta'].
 */
export function resolveLayerRoots(config: ArchConfig): string[] {
  const roots = [config.root];

  for (const sliceDir of config.sliceDirs ?? []) {
    const sliceDirPath = path.join(config.root, sliceDir);
    if (!fs.existsSync(path.resolve(sliceDirPath))) continue;

    const entries = fs.readdirSync(path.resolve(sliceDirPath), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        roots.push(path.join(sliceDirPath, entry.name));
      }
    }
  }

  return roots;
}
