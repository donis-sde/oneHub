/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { createRetoolApiKeyMiddleware } from '@/middlewares/createRetoolApiKeyMiddleware';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { createHttpMethodMiddleware } from '@/middlewares/createHttpMethodMiddleware';
import { HttpMethod } from '@/enums/HttpMethod';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { Paginated } from '@/types/Pagination';
import { CreditEventLogDto } from '@/dataAccess/models/CreditEventLog';
import { WithId } from 'mongodb';

export type RetoolCreditEventLogsListResponse = Paginated<
  WithId<CreditEventLogDto>
>;
export type RetoolCreditEventLogsFindOneAndUpdateResponse = {
  success: boolean;
  data: WithId<CreditEventLogDto> | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    | RetoolCreditEventLogsListResponse
    | RetoolCreditEventLogsFindOneAndUpdateResponse
  >,
): Promise<void> {
  const { logger, creditEventLogDao, backofficeDbUpdateLogsDao } =
    await getServerDiContainer();

  try {
    await middlewareFlattener<
      | RetoolCreditEventLogsListResponse
      | RetoolCreditEventLogsFindOneAndUpdateResponse
    >([
      createLogContextMiddleware(),
      createHttpMethodMiddleware([HttpMethod.GET, HttpMethod.PUT]),
      createRetoolApiKeyMiddleware(),
      async (
        req: NextApiRequest,
        res: NextApiResponse<
          | RetoolCreditEventLogsListResponse
          | RetoolCreditEventLogsFindOneAndUpdateResponse
        >,
      ): Promise<void> => {
        const loggerMetadata = {
          ...req.logContext,
          functionName: 'retoolCreditEventLogsHandler',
          API: 'RetoolCreditEventLogs',
        };

        logger.debug('Retool credit event logs request', {
          method: req.method,
          query: req.query,
          loggerMetadata,
        });

        if (req.method === HttpMethod.GET) {
          // Handle GET - List credit event logs with filters
          const { skip = 0, limit = 25, ...filters } = req.query;

          const paginator = {
            skip: parseInt(skip as string),
            limit: parseInt(limit as string),
          };

          const result = await creditEventLogDao.list(
            paginator,
            filters as any,
          );

          // Log the operation
          await backofficeDbUpdateLogsDao.insertMany([
            {
              collectionName: 'CreditEventLog',
              oldValue: 'N/A',
              impactedRecordObjectId: 'N/A',
              tenantId: 'N/A',
              impactedRecordEmail: 'N/A',
              dbName: 'BILLING_DATABASE',
              changedBy: 'retool@api',
              fieldChanged: 'find',
              newValue: 'N/A',
              filterUsed: JSON.stringify(filters),
              timestamp: new Date(),
            },
          ]);

          res.status(200).json(result);
        } else if (req.method === HttpMethod.PUT) {
          // Handle PUT - findOneAndUpdate using filters
          const { filters, field, value, updates } = req.body;

          if (!filters) {
            res.status(400).json({ success: false, data: null });
            return;
          }

          let updatedCreditEventLog: WithId<CreditEventLogDto> | null = null;
          let fieldChanged = '';
          let newValue = '';

          // Support both single field update and multiple field update
          if (updates && typeof updates === 'object') {
            // Multiple field update
            updatedCreditEventLog =
              await creditEventLogDao.findAndUpdateOneMultiple(
                filters,
                updates,
              );
            fieldChanged = 'multiple_fields';
            newValue = JSON.stringify(updates);
          } else if (field !== undefined && value !== undefined) {
            // Single field update (backward compatibility)
            updatedCreditEventLog = await creditEventLogDao.findAndUpdateOne(
              filters,
              field as keyof CreditEventLogDto,
              value,
            );
            fieldChanged = field;
            newValue = JSON.stringify(value);
          } else {
            res.status(400).json({ success: false, data: null });
            return;
          }

          // Log the operation
          await backofficeDbUpdateLogsDao.insertMany([
            {
              collectionName: 'CreditEventLog',
              oldValue: 'N/A',
              impactedRecordObjectId:
                updatedCreditEventLog?._id?.toString() || 'N/A',
              tenantId: 'N/A',
              impactedRecordEmail: 'N/A',
              dbName: 'BILLING_DATABASE',
              changedBy: 'retool@api',
              fieldChanged: fieldChanged,
              newValue: newValue,
              filterUsed: JSON.stringify(filters),
              timestamp: new Date(),
            },
          ]);

          res.status(200).json({ success: true, data: updatedCreditEventLog });
        }
      },
    ])(req, res);
  } catch (err) {
    logger.error('/api/retool/billing/credit-event-logs:error', {
      err: `${err}`,
    });
    res.status(500).json({
      data: [],
      paginator: { skip: 0, limit: 0 },
      hasNext: false,
      count: 0,
    });
  }
}
