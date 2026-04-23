import { describe, it } from 'vitest';
import { normalise }        from './utils/normalise.js';
import { evaluate }         from './evaluate.js';
import { formatViolations } from './format.js';
import type { ArchConfig }  from './types.js';

export function runArchRules(config: ArchConfig): void {
  describe('Architecture', () => {
    for (const [name, ruleConfig] of Object.entries(config.rules)) {
      const [severity, options] = normalise(ruleConfig);
      if (severity === 'off') continue;

      it(name, async () => {
        const violations = await evaluate(name, config, options);
        if (violations.length === 0) return;

        const report = formatViolations(name, violations);

        if (config.mode === 'report' || severity === 'warn') {
          console.warn(`\n[arch] ${report}`);
        } else {
          throw new Error(`\n[arch] ${report}`);
        }
      });
    }
  });
}
