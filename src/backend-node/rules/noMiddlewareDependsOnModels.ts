import { checkLayerDependencyRaw } from '../../common/utils/layerDependency.js';
import { matchesAny } from '../../utils/glob.js';
import type {
  ArchConfig,
  NoMiddlewareDependsOnModelsOptions,
  Violation,
} from '../../types.js';

export async function noMiddlewareDependsOnModels(
  config: ArchConfig,
  options: NoMiddlewareDependsOnModelsOptions
): Promise<Violation[]> {
  const raw = await checkLayerDependencyRaw(config, 'middlewares', 'models');

  const forbiddenGlobs = options.forbiddenModelGlobs ?? [];
  const allowedGlobs = options.allowedModelGlobs ?? [];

  return raw
    .filter(({ file }) => !matchesAny(file, options.except ?? []))
    .filter(({ to }) => {
      if (forbiddenGlobs.length > 0) return matchesAny(to, forbiddenGlobs);
      if (allowedGlobs.length > 0) return !matchesAny(to, allowedGlobs);
      return true;
    })
    .map(({ file, to }) => ({
      file,
      message: `imports from ${to}`,
    }));
}
