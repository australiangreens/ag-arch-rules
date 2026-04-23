import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, RequireErrorHierarchyOptions, Violation } from '../../types.js';

function importsFromRelative(content: string): boolean {
  return /from\s+['"]\./m.test(content);
}

function importsFromAgError(content: string): boolean {
  return content.includes('@australiangreens/ag-error');
}

export async function requireErrorHierarchy(
  config: ArchConfig,
  options: RequireErrorHierarchyOptions
): Promise<Violation[]> {
  const absErrorsDir = path.resolve(config.root, 'errors');
  if (!fs.existsSync(absErrorsDir)) return [];

  const allFiles = await findFiles(
    path.posix.join(absErrorsDir.replace(/\\/g, '/'), '**/*.ts')
  );
  const nonIndexFiles = allFiles.filter(f => !f.endsWith('index.ts'));

  let rootFile: string;

  if (options.rootErrorClass) {
    rootFile = toRelative(path.join(absErrorsDir, options.rootErrorClass));
  } else {
    const candidates = nonIndexFiles.filter(f => {
      const content = fs.readFileSync(f, 'utf8');
      return importsFromAgError(content) && !importsFromRelative(content);
    });

    if (candidates.length === 0) {
      throw new Error(
        `require-error-hierarchy: auto-detection found 0 root error class candidates in ${toRelative(absErrorsDir)}`
      );
    }
    if (candidates.length > 1) {
      throw new Error(
        `require-error-hierarchy: auto-detection found ${candidates.length} root error class candidates: ${candidates.join(', ')}`
      );
    }
    rootFile = candidates[0];
  }

  const violations: Violation[] = [];

  for (const file of nonIndexFiles) {
    if (file === rootFile) continue;
    if (matchesAny(file, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    if (!importsFromRelative(content)) {
      violations.push({
        file,
        message: 'does not import from another src/errors/** file (not part of error hierarchy)',
      });
    }
  }

  return violations;
}
