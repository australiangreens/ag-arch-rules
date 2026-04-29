import { describe, it, expect } from 'vitest';
import { requireSecretsManagerGrants } from '../../../src/cdk/rules/requireSecretsManagerGrants.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/infra-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('requireSecretsManagerGrants', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await requireSecretsManagerGrants({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when secretsmanager is used without grantRead', async () => {
    const violations = await requireSecretsManagerGrants({ ...base, root: VIOLATIONS }, {});
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toMatch(/grantRead/);
  });

  it('returns no violations when secretsmanager is not used', async () => {
    const violations = await requireSecretsManagerGrants({ ...base, root: 'tests/fixtures/cdk-rules/no-constructs' }, {});
    expect(violations).toHaveLength(0);
  });
});
