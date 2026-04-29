import { describe, it, expect } from 'vitest';
import { noLambdaImportsFromInfra } from '../../../src/cdk/rules/noLambdaImportsFromInfra.js';

const CONFORMANT = 'tests/fixtures/cdk-rules/conformant';
const VIOLATIONS = 'tests/fixtures/cdk-rules/lambda-violations';
const base = { mode: 'enforce' as const, rules: {} };

describe('noLambdaImportsFromInfra', () => {
  it('returns no violations for a conformant project', async () => {
    const violations = await noLambdaImportsFromInfra({ ...base, root: CONFORMANT }, {});
    expect(violations).toHaveLength(0);
  });

  it('reports a violation when a lambda file imports from infra/', async () => {
    const violations = await noLambdaImportsFromInfra({ ...base, root: VIOLATIONS }, {});
    expect(violations.some(v => v.file.includes('badFunction/index.ts'))).toBe(true);
    expect(violations[0].message).toMatch(/infra/);
  });

  it('returns no violations when lambda/ is absent', async () => {
    const violations = await noLambdaImportsFromInfra({ ...base, root: 'tests/fixtures/cdk-rules/no-constructs' }, {});
    expect(violations).toHaveLength(0);
  });

  it('respects except globs', async () => {
    const violations = await noLambdaImportsFromInfra({ ...base, root: VIOLATIONS }, {
      except: ['tests/fixtures/cdk-rules/lambda-violations/lambda/badFunction/index.ts'],
    });
    expect(violations).toHaveLength(0);
  });
});
