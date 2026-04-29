import * as fs from 'node:fs';
import * as path from 'node:path';
import { findFiles, matchesAny, toRelative } from '../../utils/glob.js';
import type { ArchConfig, BaseRuleOptions, Violation } from '../../types.js';

// Matches: SOME_SECRET: 'value', SOME_API_KEY: "value", etc.
const SENSITIVE_KEY_RE = /\b(\w*(?:SECRET|_API_KEY|PASSWORD|TOKEN)\w*)\s*:\s*['"]([^'"]{3,})['"]/g;

export async function noHardcodedSecretValues(
  config: ArchConfig,
  options: BaseRuleOptions
): Promise<Violation[]> {
  const infraDir = path.resolve(config.root, 'infra');
  if (!fs.existsSync(infraDir)) return [];

  const pattern = path.posix.join(infraDir.replace(/\\/g, '/'), '**/*.ts');
  const files = await findFiles(pattern);
  const violations: Violation[] = [];

  for (const file of files) {
    const relFile = toRelative(file);
    if (matchesAny(relFile, options.except ?? [])) continue;

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      SENSITIVE_KEY_RE.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = SENSITIVE_KEY_RE.exec(line)) !== null) {
        const [, keyName] = match;
        violations.push({
          file: relFile,
          line: i + 1,
          message: `${keyName} must not be a hardcoded string literal — read from process.env.* at synthesis time instead`,
        });
      }
    }
  }

  return violations;
}
