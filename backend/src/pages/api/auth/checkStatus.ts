// pages/api/auth/checkStatus.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { CookieKey } from '@/constants/CookieKey';
import { verifyAndDecode } from '@/utils/jwtUtils';
import { AuthJwt, isAuthJwt } from '@/types/AuthJwt';
import { getEnv } from '@/utils/getEnv';

interface AuthResponse {
  success: boolean;
  role: string | null;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuthResponse>,
): Promise<void> {
  return new Promise((resolve) => {
    try {
      const { JWT_SECRET } = getEnv();
      const token = req.cookies[CookieKey.WATI_AUTH];
      if (!token) {
        res.status(200).json({ success: false, role: null });
        return resolve();
      }

      const decoded = verifyAndDecode<AuthJwt>(token, JWT_SECRET, isAuthJwt);
      if (!decoded) {
        res.status(200).json({ success: false, role: null });
        return resolve();
      }

      res.status(200).json({ success: true, role: decoded.role });
      resolve();
    } catch (error) {
      res.status(500).json({ success: false, role: null });
      resolve();
    }
  });
}
