import { checkCrossSliceImports } from '../../common/utils/crossSliceImports.js';
import type { ArchConfig, NoEndpointsDependOnEndpointsOptions, Violation } from '../../types.js';

export function noEndpointsDependOnEndpoints(
  config: ArchConfig,
  options: NoEndpointsDependOnEndpointsOptions
): Promise<Violation[]> {
  return checkCrossSliceImports(config, { ...options, sliceDir: 'endpoints' });
}
