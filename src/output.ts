import * as fs from 'node:fs';
import type { RuleResult, JsonViolationRecord } from './types.js';

export function writeJsonOutput(results: RuleResult[], outputPath: string): void {
  const records: JsonViolationRecord[] = results.flatMap(({ rule, severity, violations }) =>
    violations.map(v => ({
      rule,
      severity,
      file: v.file,
      ...(v.line !== undefined && { line: v.line }),
      message: v.message,
    }))
  );
  fs.writeFileSync(outputPath, JSON.stringify(records, null, 2));
}
