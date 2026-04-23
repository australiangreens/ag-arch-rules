import { describe, it, expect } from 'vitest';
import { normalise } from '../../src/utils/normalise.js';

describe('normalise', () => {
  it('passes a string severity through with empty options', () => {
    expect(normalise('error')).toEqual(['error', {}]);
    expect(normalise('warn')).toEqual(['warn', {}]);
    expect(normalise('off')).toEqual(['off', {}]);
  });

  it('unpacks a tuple into severity and options', () => {
    expect(normalise(['warn', { tsx: 200, ts: 150 }])).toEqual([
      'warn',
      { tsx: 200, ts: 150 },
    ]);
  });

  it('preserves except arrays from tuple options', () => {
    expect(normalise(['error', { except: ['src/foo/**'] }])).toEqual([
      'error',
      { except: ['src/foo/**'] },
    ]);
  });
});
