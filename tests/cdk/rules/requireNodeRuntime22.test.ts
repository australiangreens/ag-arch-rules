import { describe, it, expect } from 'vitest';
import { requireNodeRuntime22 } from '../../../src/cdk/rules/requireNodeRuntime22.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireNodeRuntime22', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireNodeRuntime22({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when the construct uses NODEJS_20_X', async () => {
    const violations = await requireNodeRuntime22({ ...base, root: VIOLATIONS }, {});
    expect(violations.some(v => v.file.includes('constructs/MyFn.ts'))).toBe(true);
    expect(violations[0].message).toMatch(/22/);
  });

  it('returns no violations when infra/constructs/ is absent', async () => {
    const violations = await requireNodeRuntime22({ ...base, root: 'tests/fixtures/cdk-rules/no-constructs' }, {});
    expect(violations).toHaveLength(0);
  });

  it('respects except globs', async () => {
    const violations = await requireNodeRuntime22({ ...base, root: VIOLATIONS }, {
      except: ['tests/fixtures/cdk-rules/infra-violations/infra/constructs/MyFn.ts'],
    });
    expect(violations).toHaveLength(0);
  });
});
