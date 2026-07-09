import { HttpMethod, isHttpMethod } from '@/enums/HttpMethod';
import { EmptyPromiseFunction } from '@/types/EmptyPromiseFunction';
import { NextApiRequest, NextApiResponse } from 'next';

export const createHttpMethodMiddleware =
  (allowedHttpMethods: HttpMethod[]) =>
  async <R>(
    req: NextApiRequest,
    res: NextApiResponse<R>,
    next?: EmptyPromiseFunction,
  ): Promise<void> => {
    if (
      !req.method ||
      !isHttpMethod(req.method) ||
      !allowedHttpMethods.includes(req.method)
    ) {
      throw new Error(`${req.method} unsupported`);
    }

    next && (await next());
  };
