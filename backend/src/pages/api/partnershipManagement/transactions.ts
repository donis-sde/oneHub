import { transactionsHandler } from './transactionHandlers';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  try {
    await transactionsHandler(req, res);
  } catch (error: Error | unknown) {
    console.error('Error in transactions API:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal Server Error';
    res.status(500).json({ error: errorMessage });
  }
}
