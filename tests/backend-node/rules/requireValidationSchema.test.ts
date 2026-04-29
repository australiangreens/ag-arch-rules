import { describe, it, expect } from 'vitest';
import { requireValidationSchema } from '../../../src/backend-node/rules/requireValidationSchema.js';

const FIXTURE_ROOT = 'tests/fixtures/backend-rules/src';
const baseConfig = { root: FIXTURE_ROOT, mode: 'enforce' as const, rules: {} };

describe('requireValidationSchema', () => {
  it('reports endpoint directories with index.ts and no validationSchemas.ts', async () => {
    const violations = await requireValidationSchema(baseConfig, {});
    expect(violations.some(v => v.file.includes('endpoints/missing-schema/validationSchemas.ts'))).toBe(true);
    expect(violations.every(v => !v.file.includes('endpoints/has-schema/validationSchemas.ts'))).toBe(true);
  });

  it('applies except globs to missing validationSchemas.ts path', async () => {
    const violations = await requireValidationSchema(baseConfig, {
      except: ['tests/fixtures/backend-rules/src/endpoints/missing-schema/validationSchemas.ts'],
    });
    expect(violations.every(v => !v.file.includes('endpoints/missing-schema/validationSchemas.ts'))).toBe(true);
  });
});
