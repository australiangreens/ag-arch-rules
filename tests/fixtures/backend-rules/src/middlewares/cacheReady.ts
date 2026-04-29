import { cacheReady } from '../models/infra/cacheClient';

export function redisReady() {
  return cacheReady();
}
