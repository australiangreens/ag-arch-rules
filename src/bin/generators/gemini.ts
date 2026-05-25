import * as fs from 'node:fs';
import * as path from 'node:path';
import { upsertSentinelSection, buildMarkdownContent } from './shared.js';

export function generateGemini(
  projectRoot: string,
  selectedPresets: string[],
  version: string,
): string[] {
  const geminiPath = path.join(projectRoot, 'GEMINI.md');
  const existing = fs.existsSync(geminiPath) ? fs.readFileSync(geminiPath, 'utf8') : '';
  const section = buildMarkdownContent(selectedPresets, version);
  const updated = upsertSentinelSection(existing, section);
  fs.writeFileSync(geminiPath, updated);
  return ['GEMINI.md'];
}
