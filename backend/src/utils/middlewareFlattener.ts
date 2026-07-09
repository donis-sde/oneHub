import { ChainableNextMiddleware } from '@/types/ChainableNextMiddleware';
import { NextApiRequest, NextApiResponse } from 'next';

export const middlewareFlattener =
  <R>(middlewares: ChainableNextMiddleware<R>[]) =>
  async (req: NextApiRequest, res: NextApiResponse<R>): Promise<void> => {
    for (const currentMiddleware of middlewares) {
      await new Promise<void>(async (resolve, reject) => {
        try {
          await currentMiddleware(req, res, async () => resolve());
        } catch (err) {
          reject(err);
        }
      });
    }
  };
