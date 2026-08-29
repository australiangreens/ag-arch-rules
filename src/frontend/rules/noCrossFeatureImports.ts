import { checkCrossSliceImports } from '../../common/utils/crossSliceImports.js';
import type { ArchConfig, NoCrossFeatureImportsOptions, Violation } from '../../types.js';

export function noCrossFeatureImports(
  config: ArchConfig,
  options: NoCrossFeatureImportsOptions
): Promise<Violation[]> {
  return checkCrossSliceImports(config, {
    ...options,
    sliceDir: options.sliceDir ?? config.sliceDirs?.[0] ?? 'features',
  });
}
