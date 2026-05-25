import { multiselect, intro, outro, isCancel, cancel, log } from '@clack/prompts';
import { generateCursor } from './generators/cursor.js';
import { generateClaude } from './generators/claude.js';
import { generateGemini } from './generators/gemini.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

function getVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const pkgPath = path.join(path.dirname(__filename), '../../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version: string };
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

async function main(): Promise<void> {
  intro('ag-arch-rules init');

  const tools = await multiselect({
    message: 'Which AI tools should we generate context files for?',
    options: [
      { value: 'cursor', label: 'Cursor' },
      { value: 'claude', label: 'Claude Code' },
      { value: 'gemini', label: 'Gemini' },
    ],
  });

  if (isCancel(tools)) {
    cancel('Cancelled.');
    process.exit(0);
  }

  const presets = await multiselect({
    message: 'Which rule sets apply to this project?',
    options: [
      { value: 'frontend', label: 'Frontend (React/TypeScript)' },
      { value: 'backend-node', label: 'Backend Node (Express/TypeScript)' },
      { value: 'cdk', label: 'CDK (AWS CDK infrastructure)' },
    ],
    required: false,
  });

  if (isCancel(presets)) {
    cancel('Cancelled.');
    process.exit(0);
  }

  const projectRoot = process.cwd();
  const version = getVersion();
  const written: string[] = [];

  if ((tools as string[]).includes('cursor')) {
    const files = generateCursor(projectRoot, presets as string[], version);
    written.push(...files);
  }
  if ((tools as string[]).includes('claude')) {
    const files = generateClaude(projectRoot, presets as string[], version);
    written.push(...files);
  }
  if ((tools as string[]).includes('gemini')) {
    const files = generateGemini(projectRoot, presets as string[], version);
    written.push(...files);
  }

  for (const file of written) {
    log.success(file);
  }

  outro('Done! Commit the generated files so your team benefits immediately.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
