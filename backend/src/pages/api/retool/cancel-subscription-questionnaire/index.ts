/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { createRetoolApiKeyMiddleware } from '@/middlewares/createRetoolApiKeyMiddleware';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { createHttpMethodMiddleware } from '@/middlewares/createHttpMethodMiddleware';
import { HttpMethod } from '@/enums/HttpMethod';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { Paginated } from '@/types/Pagination';
import { CancelSubscriptionQuestionnaireDto } from '@/dataAccess/models/CancelSubscriptionQuestionnaire';
import { WithId } from 'mongodb';

export type RetoolCancelSubscriptionQuestionnaireListResponse = Paginated<
  WithId<CancelSubscriptionQuestionnaireDto>
>;
export type RetoolCancelSubscriptionQuestionnaireFindOneAndUpdateResponse = {
  success: boolean;
  data: WithId<CancelSubscriptionQuestionnaireDto> | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    | RetoolCancelSubscriptionQuestionnaireListResponse
    | RetoolCancelSubscriptionQuestionnaireFindOneAndUpdateResponse
  >,
): Promise<void> {
  const {
    logger,
    cancelSubscriptionQuestionnaireDao,
    backofficeDbUpdateLogsDao,
  } = await getServerDiContainer();

  try {
    await middlewareFlattener<
      | RetoolCancelSubscriptionQuestionnaireListResponse
      | RetoolCancelSubscriptionQuestionnaireFindOneAndUpdateResponse
    >([
      createLogContextMiddleware(),
      createHttpMethodMiddleware([HttpMethod.GET, HttpMethod.PUT]),
      createRetoolApiKeyMiddleware(),
      async (
        req: NextApiRequest,
        res: NextApiResponse<
          | RetoolCancelSubscriptionQuestionnaireListResponse
          | RetoolCancelSubscriptionQuestionnaireFindOneAndUpdateResponse
        >,
      ): Promise<void> => {
        const loggerMetadata = {
          ...req.logContext,
          functionName: 'retoolCancelSubscriptionQuestionnaireHandler',
          API: 'RetoolCancelSubscriptionQuestionnaire',
        };

        logger.debug('Retool cancel subscription questionnaire request', {
          method: req.method,
          query: req.query,
          body: req.body,
          loggerMetadata,
        });

        if (req.method === HttpMethod.GET) {
          // Handle GET - List questionnaires with filters
          const { skip = 0, limit = 25, ...filters } = req.query;

          const paginator = {
            skip: parseInt(skip as string),
            limit: parseInt(limit as string),
          };

          const result = await cancelSubscriptionQuestionnaireDao.list(
            paginator,
            filters as any,
          );

          // Log the operation
          await backofficeDbUpdateLogsDao.insertMany([
            {
              collectionName: 'CancelSubscriptionQuestionnaire',
              oldValue: 'N/A',
              impactedRecordObjectId: 'N/A',
              tenantId: 'N/A',
              impactedRecordEmail: 'N/A',
              dbName: 'TENANTS_DATABASE',
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

          let updatedQuestionnaire: WithId<CancelSubscriptionQuestionnaireDto> | null =
            null;
          let fieldChanged = '';
          let newValue = '';

          // Support both single field update and multiple field update
          if (updates && typeof updates === 'object') {
            // Multiple field update
            updatedQuestionnaire =
              await cancelSubscriptionQuestionnaireDao.findAndUpdateOneMultiple(
                filters,
                updates,
              );
            fieldChanged = 'multiple_fields';
            newValue = JSON.stringify(updates);
          } else if (field !== undefined && value !== undefined) {
            // Single field update (backward compatibility)
            updatedQuestionnaire =
              await cancelSubscriptionQuestionnaireDao.findAndUpdateOne(
                filters,
                field as keyof CancelSubscriptionQuestionnaireDto,
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
              collectionName: 'CancelSubscriptionQuestionnaire',
              oldValue: 'N/A',
              impactedRecordObjectId:
                updatedQuestionnaire?._id?.toString() || 'N/A',
              tenantId: 'N/A',
              impactedRecordEmail: 'N/A',
              dbName: 'TENANTS_DATABASE',
              changedBy: 'retool@api',
              fieldChanged: fieldChanged,
              newValue: newValue,
              filterUsed: JSON.stringify(filters),
              timestamp: new Date(),
            },
          ]);

          res.status(200).json({ success: true, data: updatedQuestionnaire });
        }
      },
    ])(req, res);
  } catch (err) {
    logger.error('/api/retool/cancel-subscription-questionnaire:error', {
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
