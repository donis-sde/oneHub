/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { createRetoolApiKeyMiddleware } from '@/middlewares/createRetoolApiKeyMiddleware';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { createHttpMethodMiddleware } from '@/middlewares/createHttpMethodMiddleware';
import { HttpMethod } from '@/enums/HttpMethod';
import { middlewareFlattener } from '@/utils/middlewareFlattener';

export type RetoolTenantsBatchUpdateResponse = {
  success: boolean;
  matchedCount: number;
  updatedCount: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RetoolTenantsBatchUpdateResponse>,
): Promise<void> {
  const { logger, tenantDao, backofficeDbUpdateLogsDao } =
    await getServerDiContainer();

  try {
    await middlewareFlattener<RetoolTenantsBatchUpdateResponse>([
      createLogContextMiddleware(),
      createHttpMethodMiddleware([HttpMethod.POST]),
      createRetoolApiKeyMiddleware(),
      async (
        req: NextApiRequest,
        res: NextApiResponse<RetoolTenantsBatchUpdateResponse>,
      ): Promise<void> => {
        const loggerMetadata = {
          ...req.logContext,
          functionName: 'retoolTenantsBatchUpdateHandler',
          API: 'RetoolTenantsBatchUpdate',
        };

        logger.debug('Retool tenants batch update request', {
          body: req.body,
          loggerMetadata,
        });

        const { filters, updates } = req.body;

        if (!filters || !updates) {
          res.status(400).json({
            success: false,
            matchedCount: 0,
            updatedCount: 0,
          });
          return;
        }

        // For batch update, we'll update the first field in the updates object
        const updateFields = Object.keys(updates);
        if (updateFields.length === 0) {
          res.status(400).json({
            success: false,
            matchedCount: 0,
            updatedCount: 0,
          });
          return;
        }

        const field = updateFields[0] as keyof any;
        const value = updates[field];

        const result = await tenantDao.updateByFilter(
          filters,
          field as any,
          value,
        );

        // Log the operation
        await backofficeDbUpdateLogsDao.insertMany([
          {
            collectionName: 'Tenant',
            oldValue: 'N/A',
            impactedRecordObjectId: 'N/A',
            tenantId: 'N/A',
            impactedRecordEmail: 'N/A',
            dbName: 'TENANTS_DATABASE',
            changedBy: 'retool@api',
            fieldChanged: field as string,
            newValue: JSON.stringify(value),
            filterUsed: JSON.stringify(filters),
            timestamp: new Date(),
          },
        ]);

        res.status(200).json({
          success: true,
          matchedCount: result.matchedCount,
          updatedCount: result.updatedCount,
        });
      },
    ])(req, res);
  } catch (err) {
    logger.error('/api/retool/tenants/batch-update:error', { err: `${err}` });
    res.status(500).json({
      success: false,
      matchedCount: 0,
      updatedCount: 0,
    });
  }
}
