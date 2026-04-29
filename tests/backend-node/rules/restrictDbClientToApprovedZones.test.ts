import { describe, it, expect } from 'vitest';
import { restrictDbClientToApprovedZones } from '../../../src/backend-node/rules/restrictDbClientToApprovedZones.js';

const FIXTURE_ROOT = 'tests/fixtures/backend-rules/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('restrictDbClientToApprovedZones', () => {
  it('flags DB client imports outside approved zones', async () => {
    const violations = await restrictDbClientToApprovedZones(baseConfig, {});
    expect(violations.some(v => v.file.includes('endpoints/db-violator.ts'))).toBe(true);
    expect(violations.some(v => v.file.includes('lib/dbUtil.ts'))).toBe(true);
  });

  it('does not flag approved model db paths by default', async () => {
    const violations = await restrictDbClientToApprovedZones(baseConfig, {});
    expect(violations.every(v => !v.file.includes('models/db/repository.ts'))).toBe(true);
  });

  it('respects except patterns', async () => {
    const violations = await restrictDbClientToApprovedZones(baseConfig, {
      except: ['tests/fixtures/backend-rules/src/endpoints/db-violator.ts'],
    });
    expect(violations.every(v => !v.file.includes('endpoints/db-violator.ts'))).toBe(true);
  });

  it('can ignore require() calls when configured', async () => {
    const violations = await restrictDbClientToApprovedZones(baseConfig, {
      includeRequire: false,
    });
    expect(violations.every(v => !v.file.includes('lib/dbUtil.ts'))).toBe(true);
  });
});
