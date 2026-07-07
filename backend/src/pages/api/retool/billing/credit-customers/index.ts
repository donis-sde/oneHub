/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { createRetoolApiKeyMiddleware } from '@/middlewares/createRetoolApiKeyMiddleware';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { createHttpMethodMiddleware } from '@/middlewares/createHttpMethodMiddleware';
import { HttpMethod } from '@/enums/HttpMethod';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { Paginated } from '@/types/Pagination';
import { CreditCustomer } from '@/dataAccess/models/CreditCustomer';
import { WithId } from 'mongodb';

export type RetoolCreditCustomersListResponse = Paginated<
  WithId<CreditCustomer>
>;
export type RetoolCreditCustomersFindOneAndUpdateResponse = {
  success: boolean;
  data: WithId<CreditCustomer> | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    | RetoolCreditCustomersListResponse
    | RetoolCreditCustomersFindOneAndUpdateResponse
  >,
): Promise<void> {
  const { logger, creditCustomerDao, backofficeDbUpdateLogsDao } =
    await getServerDiContainer();

  try {
    await middlewareFlattener<
      | RetoolCreditCustomersListResponse
      | RetoolCreditCustomersFindOneAndUpdateResponse
    >([
      createLogContextMiddleware(),
      createHttpMethodMiddleware([HttpMethod.GET, HttpMethod.PUT]),
      createRetoolApiKeyMiddleware(),
      async (
        req: NextApiRequest,
        res: NextApiResponse<
          | RetoolCreditCustomersListResponse
          | RetoolCreditCustomersFindOneAndUpdateResponse
        >,
      ): Promise<void> => {
        const loggerMetadata = {
          ...req.logContext,
          functionName: 'retoolCreditCustomersHandler',
          API: 'RetoolCreditCustomers',
        };

        logger.debug('Retool credit customers request', {
          method: req.method,
          query: req.query,
          loggerMetadata,
        });

        if (req.method === HttpMethod.GET) {
          // Handle GET - List credit customers with filters
          const { skip = 0, limit = 25, ...filters } = req.query;

          const paginator = {
            skip: parseInt(skip as string),
            limit: parseInt(limit as string),
          };

          const result = await creditCustomerDao.list(
            paginator,
            filters as any,
          );

          // Log the operation
          await backofficeDbUpdateLogsDao.insertMany([
            {
              collectionName: 'CreditCustomer',
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

          let updatedCreditCustomer: WithId<CreditCustomer> | null = null;
          let fieldChanged = '';
          let newValue = '';

          // Support both single field update and multiple field update
          if (updates && typeof updates === 'object') {
            // Multiple field update
            updatedCreditCustomer =
              await creditCustomerDao.findAndUpdateOneMultiple(
                filters,
                updates,
              );
            fieldChanged = 'multiple_fields';
            newValue = JSON.stringify(updates);
          } else if (field !== undefined && value !== undefined) {
            // Single field update (backward compatibility)
            updatedCreditCustomer = await creditCustomerDao.findAndUpdateOne(
              filters,
              field as keyof CreditCustomer,
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
              collectionName: 'CreditCustomer',
              oldValue: 'N/A',
              impactedRecordObjectId:
                updatedCreditCustomer?._id?.toString() || 'N/A',
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

          res.status(200).json({ success: true, data: updatedCreditCustomer });
        }
      },
    ])(req, res);
  } catch (err) {
    logger.error('/api/retool/billing/credit-customers:error', {
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
