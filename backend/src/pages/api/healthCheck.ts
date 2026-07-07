import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Record<string, never>>,
): Promise<void> {
  res.status(200).json({});
}
