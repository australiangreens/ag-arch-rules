import { helper } from '../shared/helper';

export const handler = async (event: unknown) => {
  return { statusCode: 200, body: helper() };
};
