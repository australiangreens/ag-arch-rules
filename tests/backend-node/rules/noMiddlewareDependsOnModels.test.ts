import { describe, it, expect } from 'vitest';
import { noMiddlewareDependsOnModels } from '../../../src/backend-node/rules/noMiddlewareDependsOnModels.js';

const FIXTURE_ROOT = 'tests/fixtures/backend-rules/src';
const baseConfig = {
  root: FIXTURE_ROOT,
  tsConfigPath: 'tests/fixtures/backend-rules/tsconfig.json',
  mode: 'enforce' as const,
  rules: {},
};

describe('noMiddlewareDependsOnModels', () => {
  it('reports middleware -> models dependencies by default', async () => {
    const violations = await noMiddlewareDependsOnModels(baseConfig, {});
    expect(violations.some(v => v.file.includes('middlewares/auth.ts'))).toBe(true);
    expect(violations.some(v => v.file.includes('middlewares/cacheReady.ts'))).toBe(true);
  });

  it('allows infra adapter dependencies when configured', async () => {
    const violations = await noMiddlewareDependsOnModels(baseConfig, {
      allowedModelGlobs: ['tests/fixtures/backend-rules/src/models/infra/**'],
    });
    expect(violations.some(v => v.file.includes('middlewares/auth.ts'))).toBe(true);
    expect(violations.every(v => !v.file.includes('middlewares/cacheReady.ts'))).toBe(true);
  });

  it('can target only forbidden domain model zones', async () => {
    const violations = await noMiddlewareDependsOnModels(baseConfig, {
      forbiddenModelGlobs: ['tests/fixtures/backend-rules/src/models/domain/**'],
    });
    expect(violations.some(v => v.file.includes('middlewares/auth.ts'))).toBe(true);
    expect(violations.every(v => !v.file.includes('middlewares/cacheReady.ts'))).toBe(true);
  });
});
