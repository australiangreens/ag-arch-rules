import { describe, it, expect } from 'vitest';
import { defineArchConfig } from '../src/defineArchConfig.js';

describe('defineArchConfig', () => {
  it('returns the config object unchanged', () => {
    const config = {
      root: 'src',
      mode: 'report' as const,
      rules: { 'max-file-lines': 'warn' as const },
    };
    expect(defineArchConfig(config)).toBe(config);
  });
});
