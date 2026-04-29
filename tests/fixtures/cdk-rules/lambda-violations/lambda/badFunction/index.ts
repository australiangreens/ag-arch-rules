import { AgNodejsFunction } from '../../infra/constructs/AgNodejsFunction';

export const setup = () => {
  return new AgNodejsFunction({} as any, 'id', {});
};
