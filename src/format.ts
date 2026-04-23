import type { Violation } from './types.js';

export function formatViolations(ruleName: string, violations: Violation[]): string {
  const count = violations.length;
  const noun = count === 1 ? 'violation' : 'violations';
  const lines = violations.map(v => `  ${v.file}: ${v.message}`);
  return `Rule '${ruleName}' has ${count} ${noun}:\n${lines.join('\n')}`;
}
