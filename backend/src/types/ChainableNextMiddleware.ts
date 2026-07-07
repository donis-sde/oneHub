import { NextApiRequest, NextApiResponse } from 'next';
import { EmptyPromiseFunction } from './EmptyPromiseFunction';

export type ChainableNextMiddleware<R> = (
  req: NextApiRequest,
  res: NextApiResponse<R>,
  next?: EmptyPromiseFunction,
) => Promise<void>;
