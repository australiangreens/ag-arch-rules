import * as fs from 'node:fs';
import * as path from 'node:path';
import { upsertSentinelSection, buildMarkdownContent } from './shared.js';

export function generateClaude(
  projectRoot: string,
  selectedPresets: string[],
  version: string,
): void {
  const claudePath = path.join(projectRoot, 'CLAUDE.md');
  const existing = fs.existsSync(claudePath) ? fs.readFileSync(claudePath, 'utf8') : '';
  const section = buildMarkdownContent(selectedPresets, version);
  const updated = upsertSentinelSection(existing, section);
  fs.writeFileSync(claudePath, updated);
}
