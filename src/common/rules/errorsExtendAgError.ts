import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, RequireErrorHierarchyOptions, Violation } from '../../types.js';

function importsFromRelative(content: string): boolean {
  return /from\s+['"]\./m.test(content);
}

export async function errorsExtendAgError(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const opts = options as RequireErrorHierarchyOptions;
  const absErrorsDir = path.resolve(config.root, 'errors');
  if (!fs.existsSync(absErrorsDir)) return [];

  const allFiles = await findFiles(
    path.posix.join(absErrorsDir.replace(/\\/g, '/'), '**/*.ts')
  );
  const nonIndexFiles = allFiles.map(toRelative).filter(f => !f.endsWith('index.ts'));

  let rootFile: string;

  if (opts.rootErrorClass) {
    rootFile = toRelative(path.join(absErrorsDir, opts.rootErrorClass));
  } else {
    const candidates = nonIndexFiles.filter(f => {
      const content = fs.readFileSync(f, 'utf8');
      return content.includes('@australiangreens/ag-error') && !importsFromRelative(content);
    });

    if (candidates.length === 0) {
      throw new Error(
        `errors-extend-ag-error: auto-detection found 0 root error class candidates in ${toRelative(absErrorsDir)}`
      );
    }
    if (candidates.length > 1) {
      throw new Error(
        `errors-extend-ag-error: auto-detection found ${candidates.length} root error class candidates: ${candidates.join(', ')}`
      );
    }
    rootFile = candidates[0];
  }

  if (matchesAny(rootFile, opts.except ?? [])) return [];

  const content = fs.readFileSync(rootFile, 'utf8');
  if (!content.includes('@australiangreens/ag-error')) {
    return [{
      file: rootFile,
      message: 'root error class does not import from @australiangreens/ag-error',
    }];
  }

  return [];
}
