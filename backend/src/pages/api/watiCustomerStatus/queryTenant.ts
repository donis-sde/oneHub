/* eslint-disable */
// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { HttpMethod } from '@/enums/HttpMethod';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { getServerDiContainer } from '@/global/serverDiContainer';

const rbacRules = [
  {
    roles: null,
    httpMethod: HttpMethod.GET,
  },
];

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.WATI_CUSTOMER_STATUS,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    await middlewareFlattener([
      rbacMiddleware,
      createLogContextMiddleware(),
      async (req: NextApiRequest, res: NextApiResponse) => {
        let { q } = req.query;
        if (!q) {
          res.status(400).json({ error: 'query is required' });
          return;
        }

        q = q.trim();
        const { tenantDao } = await getServerDiContainer();
        const data = await tenantDao.list(
          {},
          {
            $or: [
              { TenantId: q },
              { StripeSubscriptionId: q },
              { ClientEmail: q },
              { FrontEndUrl: q },
              { WABAID: q },
              { BMID: q },
              { 'WABAPhoneInfo.display_phone_number': q },
              { ClientEmail: { $regex: q, $options: 'i' } },
              { FrontEndUrl: { $regex: q, $options: 'i' } },
            ],
          },
          {
            Created: -1,
          },
        );

        res.status(200).json({
          result: {
            ...data,
            data: data.data.map((tenant) => ({
              TenantId: tenant.TenantId,
              FrontEndUrl: tenant.FrontEndUrl,
              WABAPhoneNumber: tenant.WABAPhoneInfo?.display_phone_number,
              SubscriptionId: tenant.StripeSubscriptionId,
              ClientEmail: tenant.ClientEmail,
              State: tenant.State,
              StripeCustomerId: tenant.StripeCustomerId,
              Created: tenant.Created,
              BMID: tenant.BMID,
              WABAID: tenant.WABAID,
              BillingType: tenant.BillingType,
              PIC: tenant.PIC,
              Remark: tenant.Remark,
            })),
          },
        });
      },
    ])(req, res);
  } catch (error) {
    console.error('queryTenant error:', error);
    res.status(403).json({ error: 'Forbidden' });
  }
}
