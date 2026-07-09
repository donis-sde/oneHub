/* eslint-disable */
// @ts-nocheck

import { NextApiRequest, NextApiResponse } from 'next';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { Role } from '@/enums/Role';
import { BackofficeFeature } from '../../../enums/BackofficeFeature';
import { HttpMethod } from '@/enums/HttpMethod';

const rbacRules = [
  {
    roles: [Role.ADMIN],
    httpMethod: HttpMethod.POST,
  },
];

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.ACCESS_TO_WABA,
);

export default async function handler(
  req = NextApiRequest,
  res = NextApiResponse,
) {
  try {
    await rbacMiddleware(req, res, async () => {
      if (req.method === 'POST') {
        const { wabaId, userId } = req.body;
        const accessToken = process.env.FB_TOKEN;

        try {
          const queryParams = new URLSearchParams({
            business: process.env.FB_BUSINESS_ID,
            user: userId,
          }).toString();

          const response = await fetch(
            `https://graph.facebook.com/v23.0/${wabaId}/assigned_users?${queryParams}&tasks=["MANAGE"]`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );

          const data = await response.json();

          if (response.ok) {
            res.status(200).json(data);
          } else {
            res.status(response.status).json(data);
          }
        } catch (error) {
          res.status(500).json({ error: 'Internal Server Error' });
        }
      } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
      }
    });
  } catch (error) {
    console.error('RBAC middleware access to waba error:', error);
    res.status(403).json({ error: 'Forbidden' });
  }
}
