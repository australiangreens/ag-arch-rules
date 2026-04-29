import { loadUser } from '../models/domain/user';

export function auth() {
  return loadUser();
}
