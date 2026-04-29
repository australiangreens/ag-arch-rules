import { afterAll, describe, it } from 'vitest';
import { normalise }        from './utils/normalise.js';
import { evaluate }         from './evaluate.js';
import { formatViolations } from './format.js';
import { writeJsonOutput }  from './output.js';
import type { ArchConfig, RuleResult }  from './types.js';

export function runArchRules(config: ArchConfig): void {
  describe('Architecture', () => {
    const violationCounts: Record<string, number> = {};
    const ruleResults: RuleResult[] = [];

    for (const [name, ruleConfig] of Object.entries(config.rules)) {
      const [severity, options] = normalise(ruleConfig);
      if (severity === 'off') continue;

      it(name, async () => {
        const violations = await evaluate(name, config, options);
        ruleResults.push({ rule: name, severity, violations });
        violationCounts[name] = violations.length;
        if (violations.length === 0) return;

        const report = formatViolations(name, violations);

        if (config.mode === 'report' || severity === 'warn') {
          console.warn(`\n[arch] ${report}`);
        } else {
          throw new Error(`\n[arch] ${report}`);
        }
      });
    }

    afterAll(() => {
      const entries = Object.entries(violationCounts).filter(([, count]) => count > 0);
      if (entries.length > 0) {
        const maxNameLen = Math.max(...entries.map(([name]) => name.length));
        const maxCountLen = Math.max(...entries.map(([, count]) => String(count).length));
        const lines = entries.map(([name, count]) =>
          `  ${name.padEnd(maxNameLen)}  ${String(count).padStart(maxCountLen)}`
        );
        console.warn(`\n[arch] Violation summary:\n${lines.join('\n')}`);
      }

      const outputPath = process.env.ARCH_JSON_OUTPUT;
      if (outputPath) {
        writeJsonOutput(ruleResults, outputPath);
      }
    });
  });
}
