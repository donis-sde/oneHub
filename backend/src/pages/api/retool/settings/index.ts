/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { createRetoolApiKeyMiddleware } from '@/middlewares/createRetoolApiKeyMiddleware';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { createHttpMethodMiddleware } from '@/middlewares/createHttpMethodMiddleware';
import { HttpMethod } from '@/enums/HttpMethod';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { Paginated } from '@/types/Pagination';
import { SettingsDto } from '@/dataAccess/models/Settings';
import { WithId } from 'mongodb';

export type RetoolSettingsListResponse = Paginated<WithId<SettingsDto>>;
export type RetoolSettingsFindOneAndUpdateResponse = {
  success: boolean;
  data: WithId<SettingsDto> | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    RetoolSettingsListResponse | RetoolSettingsFindOneAndUpdateResponse
  >,
): Promise<void> {
  const { logger, settingsDao, backofficeDbUpdateLogsDao } =
    await getServerDiContainer();

  try {
    await middlewareFlattener<
      RetoolSettingsListResponse | RetoolSettingsFindOneAndUpdateResponse
    >([
      createLogContextMiddleware(),
      createHttpMethodMiddleware([HttpMethod.GET, HttpMethod.PUT]),
      createRetoolApiKeyMiddleware(),
      async (
        req: NextApiRequest,
        res: NextApiResponse<
          RetoolSettingsListResponse | RetoolSettingsFindOneAndUpdateResponse
        >,
      ): Promise<void> => {
        const loggerMetadata = {
          ...req.logContext,
          functionName: 'retoolSettingsHandler',
          API: 'RetoolSettings',
        };

        logger.debug('Retool settings request', {
          method: req.method,
          query: req.query,
          body: req.body,
          loggerMetadata,
        });

        if (req.method === HttpMethod.GET) {
          // Handle GET - List settings with filters
          const { skip = 0, limit = 25, ...filters } = req.query;

          const paginator = {
            skip: parseInt(skip as string),
            limit: parseInt(limit as string),
          };

          const result = await settingsDao.list(paginator, filters as any);

          // Log the operation
          await backofficeDbUpdateLogsDao.insertMany([
            {
              collectionName: 'Settings',
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

          let updatedSetting: WithId<SettingsDto> | null = null;
          let fieldChanged = '';
          let newValue = '';

          // Support both single field update and multiple field update
          if (updates && typeof updates === 'object') {
            // Multiple field update
            updatedSetting = await settingsDao.findAndUpdateOneMultiple(
              filters,
              updates,
            );
            fieldChanged = 'multiple_fields';
            newValue = JSON.stringify(updates);
          } else if (field !== undefined && value !== undefined) {
            // Single field update (backward compatibility)
            updatedSetting = await settingsDao.findAndUpdateOne(
              filters,
              field as keyof SettingsDto,
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
              collectionName: 'Settings',
              oldValue: 'N/A',
              impactedRecordObjectId: updatedSetting?._id?.toString() || 'N/A',
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

          res.status(200).json({ success: true, data: updatedSetting });
        }
      },
    ])(req, res);
  } catch (err) {
    logger.error('/api/retool/settings:error', { err: `${err}` });
    res.status(500).json({
      data: [],
      paginator: { skip: 0, limit: 0 },
      hasNext: false,
      count: 0,
    });
  }
}
