import { describe, it, expect } from 'vitest';
import { noEndpointsDependOnEndpoints } from '../../../src/backend-node/rules/noEndpointsDependOnEndpoints.js';

const FIXTURE_ROOT = 'tests/fixtures/backend-rules/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('noEndpointsDependOnEndpoints', () => {
  it('reports cross-feature endpoint imports', async () => {
    const violations = await noEndpointsDependOnEndpoints(baseConfig, {});
    expect(violations.some(v => v.file.includes('endpoints/feature-a/index.ts'))).toBe(true);
  });

  it('allows same-feature endpoint composition by default', async () => {
    const violations = await noEndpointsDependOnEndpoints(baseConfig, {});
    expect(
      violations.every(
        v => !(v.file.includes('endpoints/feature-a/index.ts') && v.line === 1)
      )
    ).toBe(true);
  });

  it('detects alias-based cross-feature imports', async () => {
    const violations = await noEndpointsDependOnEndpoints(baseConfig, {
      pathAliases: ['@/'],
    });
    expect(violations.some(v => v.file.includes('endpoints/feature-a/aliased.ts'))).toBe(true);
  });

  it('respects allowTargetGlobs exceptions', async () => {
    const violations = await noEndpointsDependOnEndpoints(baseConfig, {
      allowTargetGlobs: ['tests/fixtures/backend-rules/src/endpoints/feature-b/**'],
    });
    expect(violations.every(v => !v.file.includes('endpoints/feature-a/index.ts'))).toBe(true);
    expect(violations.every(v => !v.file.includes('endpoints/feature-a/aliased.ts'))).toBe(true);
  });
});
