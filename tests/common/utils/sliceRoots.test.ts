import { describe, it, expect } from 'vitest';
import { resolveLayerRoots } from '../../../src/common/utils/sliceRoots.js';

describe('resolveLayerRoots', () => {
  it('returns just config.root when sliceDirs is unset', () => {
    const roots = resolveLayerRoots({
      root: 'tests/fixtures/project/src',
      mode: 'enforce',
      rules: {},
    });
    expect(roots).toEqual(['tests/fixtures/project/src']);
  });

  it('returns just config.root when sliceDirs is empty', () => {
    const roots = resolveLayerRoots({
      root: 'tests/fixtures/project/src',
      mode: 'enforce',
      rules: {},
      sliceDirs: [],
    });
    expect(roots).toEqual(['tests/fixtures/project/src']);
  });

  it('adds one root per immediate subdirectory of a configured sliceDir', () => {
    const roots = resolveLayerRoots({
      root: 'tests/fixtures/frontend-slices/src',
      mode: 'enforce',
      rules: {},
      sliceDirs: ['features'],
    });
    expect(roots).toEqual([
      'tests/fixtures/frontend-slices/src',
      'tests/fixtures/frontend-slices/src/features/alpha',
      'tests/fixtures/frontend-slices/src/features/beta',
    ]);
  });

  it('ignores a configured sliceDir that does not exist on disk', () => {
    const roots = resolveLayerRoots({
      root: 'tests/fixtures/project/src',
      mode: 'enforce',
      rules: {},
      sliceDirs: ['does-not-exist'],
    });
    expect(roots).toEqual(['tests/fixtures/project/src']);
  });
});
