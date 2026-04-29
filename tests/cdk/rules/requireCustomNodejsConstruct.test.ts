import { describe, it, expect } from 'vitest';
import { requireCustomNodejsConstruct } from '../../../src/cdk/rules/requireCustomNodejsConstruct.js';

const CONFORMANT    = 'tests/fixtures/cdk-rules/conformant';
const NO_CONSTRUCTS = 'tests/fixtures/cdk-rules/no-constructs';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireCustomNodejsConstruct', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireCustomNodejsConstruct({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when infra/constructs/ is missing', async () => {
    const violations = await requireCustomNodejsConstruct({ ...base, root: NO_CONSTRUCTS }, {});
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toMatch(/constructs/);
  });

  it('returns no violations when infra/ is absent entirely', async () => {
    // lambda-violations has no infra/ — the rule returns [] without crashing (infra/ absence is caught by requireInfraDirectory)
    const violations = await requireCustomNodejsConstruct({ ...base, root: 'tests/fixtures/cdk-rules/lambda-violations' }, {});
    expect(violations).toHaveLength(0);
  });
});
