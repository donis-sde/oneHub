import { NextApiResponse } from 'next';

export interface HttpResponse<R> {
  status: number;
  headers?: { key: string; value: string }[];
  response: R;
}

export const applyResponse =
  <R>(HttpResponse: HttpResponse<R>) =>
  (res: NextApiResponse<R>): void => {
    const { status, headers, response } = HttpResponse;

    return (headers ?? [])
      .reduce(
        (prev, curr) => prev.setHeader(curr.key, curr.value),
        res.status(status),
      )
      .json(response);
  };
