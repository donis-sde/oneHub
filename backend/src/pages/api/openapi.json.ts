import type { NextApiRequest, NextApiResponse } from 'next';
import { generateOpenApiSpec } from '@/openapi/generateSpec';

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponse,
): void {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(generateOpenApiSpec());
}
