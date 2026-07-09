/* eslint-disable */
// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { HttpMethod } from '@/enums/HttpMethod';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { EmptyPromiseFunction } from '@/types/EmptyPromiseFunction';
import { Role } from '@/enums/Role';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { MetaClient } from '@/pages/api/waba/util/metaClient';
import { OnboardingFixLog } from '@/dataAccess/models/OnboardingFixLog';
import { extractUserFromHeaders } from '@/utils/extractUser';

const META_GRAPH_API_BASE = 'https://graph.facebook.com/v20.0';
const WATI_MT_SERVER_URL = process.env.WATI_MT_SERVER_URL;

interface OnboardingFixRequest extends NextApiRequest {
  body: {
    subscriptionId: string;
    cloudApiSetupProcessId: string;
  };
}

interface StepResult {
  step: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  data?: Record<string, unknown>;
}

export type OnboardingFixResponse = {
  success: boolean;
  message: string;
  steps: StepResult[];
};

export default async function handler(
  req: OnboardingFixRequest,
  res: NextApiResponse<OnboardingFixResponse>,
): Promise<void> {
  const { logger } = await getServerDiContainer();

  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
      steps: [],
    });
    return;
  }

  try {
    await middlewareFlattener<OnboardingFixResponse>([
      createLogContextMiddleware(),
      createRbacMiddleware(
        [
          {
            httpMethod: HttpMethod.POST,
            roles: [Role.ADMIN],
          },
        ],
        BackofficeFeature.ONBOARDING_FIX,
      ),
      async (
        req: OnboardingFixRequest,
        res: NextApiResponse<OnboardingFixResponse>,
        _next?: EmptyPromiseFunction,
      ): Promise<void> => {
        const {
          tenantDao,
          settingsDao,
          cloudApiSetupProcessDao,
          onboardingFixLogDao,
        } = await getServerDiContainer();

        const { subscriptionId, cloudApiSetupProcessId } = req.body;
        const steps: StepResult[] = [];

        const loggerMetadata: BackofficePortalLoggingMetadata = {
          ...req.logContext,
          functionName: 'onboardingFixHandler',
          API: 'OnboardingFix',
        };

        const user = extractUserFromHeaders(
          req.headers,
          loggerMetadata,
          logger,
        );
        const loggedInUserEmail = user?.email ?? 'unknown';

        const insertAuditLog = async (
          resolvedTenantId: string | null,
          success: boolean,
          failedAtStep: string | null,
          message: string,
        ) => {
          try {
            await onboardingFixLogDao.insertMany([
              new OnboardingFixLog(
                subscriptionId,
                resolvedTenantId,
                loggedInUserEmail,
                success,
                steps.length,
                failedAtStep,
                message,
                new Date(),
              ),
            ]);
          } catch (logErr) {
            logger.error('Failed to insert onboarding fix audit log', {
              logErr,
            });
          }
        };

        if (!subscriptionId || !cloudApiSetupProcessId) {
          return res.status(400).json({
            success: false,
            message: 'subscriptionId and cloudApiSetupProcessId are required',
            steps: [],
          });
        }

        logger.info('Onboarding fix started', {
          subscriptionId,
          loggerMetadata,
        });

        // Step 1: Find Tenant by StripeSubscriptionId
        let tenant: any;
        try {
          const tenants = await tenantDao.getByFilter({
            StripeSubscriptionId: subscriptionId,
          });
          tenant = tenants?.[0];

          if (!tenant) {
            steps.push({
              step: '1. Find Tenant',
              status: 'failed',
              message: `No tenant found for StripeSubscriptionId: ${subscriptionId}`,
            });
            await insertAuditLog(
              null,
              false,
              '1. Find Tenant',
              `No tenant found for StripeSubscriptionId: ${subscriptionId}`,
            );
            return res.status(404).json({
              success: false,
              message: `No tenant found for StripeSubscriptionId: ${subscriptionId}`,
              steps,
            });
          }

          steps.push({
            step: '1. Find Tenant',
            status: 'success',
            message: `Tenant found: ${tenant.TenantId}`,
            data: { tenantId: tenant.TenantId, state: tenant.State },
          });
        } catch (err) {
          steps.push({
            step: '1. Find Tenant',
            status: 'failed',
            message: `Error finding tenant: ${err}`,
          });
          await insertAuditLog(null, false, '1. Find Tenant', `${err}`);
          return res.status(500).json({
            success: false,
            message: 'Failed at step 1: Find Tenant',
            steps,
          });
        }

        const tenantId = tenant.TenantId;

        // Step 2: Fetch the selected CloudApiSetupProcess record by _id
        let cloudApiRecord: any;
        try {
          cloudApiRecord = await cloudApiSetupProcessDao.getById(
            cloudApiSetupProcessId,
          );

          if (!cloudApiRecord) {
            steps.push({
              step: '2. Load Selected CloudApiSetupProcess',
              status: 'failed',
              message: `No CloudApiSetupProcess record found for _id: ${cloudApiSetupProcessId}`,
            });
            await insertAuditLog(
              tenantId,
              false,
              '2. Load Selected CloudApiSetupProcess',
              `No record found for _id: ${cloudApiSetupProcessId}`,
            );
            return res.status(404).json({
              success: false,
              message: `No CloudApiSetupProcess record found for _id: ${cloudApiSetupProcessId}`,
              steps,
            });
          }

          steps.push({
            step: '2. Load Selected CloudApiSetupProcess',
            status: 'success',
            message: `Record loaded - BMID: ${cloudApiRecord.BMID}, WABAID: ${cloudApiRecord.WABAID}, WABAPhoneNumber: ${cloudApiRecord.WABAPhoneNumber}, WABAPhoneId: ${cloudApiRecord.WABAPhoneId}`,
            data: {
              _id: cloudApiSetupProcessId,
              BMID: cloudApiRecord.BMID,
              WABAID: cloudApiRecord.WABAID,
              WABAPhoneNumber: cloudApiRecord.WABAPhoneNumber,
              WABAPhoneId: cloudApiRecord.WABAPhoneId,
            },
          });
        } catch (err) {
          steps.push({
            step: '2. Load Selected CloudApiSetupProcess',
            status: 'failed',
            message: `Error loading CloudApiSetupProcess: ${err}`,
          });
          await insertAuditLog(
            tenantId,
            false,
            '2. Load Selected CloudApiSetupProcess',
            `${err}`,
          );
          return res.status(500).json({
            success: false,
            message: 'Failed at step 2: Load Selected CloudApiSetupProcess',
            steps,
          });
        }

        const { BMID, WABAID, WABAPhoneNumber, WABAPhoneId } = cloudApiRecord;

        // Step 3: Check WABA ban status via Meta Graph API
        try {
          const meta = new MetaClient();
          const wabaInfo = await meta.get<any>(WABAID, {
            fields: 'id,name,account_review_status',
          });
          logger.info('WABA info fetched', { wabaInfo });
          const accountReviewStatus = wabaInfo.account_review_status;
          if (accountReviewStatus === 'REJECTED') {
            steps.push({
              step: '3. Check WABA Ban Status',
              status: 'failed',
              message: `WABA ${WABAID} is BANNED (account_review_status: ${accountReviewStatus}). Cannot proceed.`,
              data: { account_review_status: accountReviewStatus },
            });
            await insertAuditLog(
              tenantId,
              false,
              '3. Check WABA Ban Status',
              `WABA ${WABAID} is banned`,
            );
            return res.status(400).json({
              success: false,
              message: `WABA ${WABAID} is banned. Onboarding fix cannot proceed for a banned WABA account.`,
              steps,
            });
          }

          steps.push({
            step: '3. Check WABA Ban Status',
            status: 'success',
            message: `WABA ${WABAID} is not banned (account_review_status: ${
              accountReviewStatus || 'APPROVED'
            })`,
            data: { account_review_status: accountReviewStatus },
          });
        } catch (err) {
          steps.push({
            step: '3. Check WABA Ban Status',
            status: 'failed',
            message: `Error checking WABA ban status: ${err}`,
          });
          await insertAuditLog(
            tenantId,
            false,
            '3. Check WABA Ban Status',
            `${err}`,
          );
          return res.status(500).json({
            success: false,
            message: 'Failed at step 3: Check WABA Ban Status',
            steps,
          });
        }

        // Step 4: Log Tenant State (informational only, no blocking)
        steps.push({
          step: '4. Tenant State',
          status: 'success',
          message: `Tenant state is "${tenant.State}"`,
        });

        // Steps 5-8 continue even if individual steps fail
        const failedSteps: string[] = [];

        // Step 5: Update Tenant — BMID + WABAPhoneInfo
        try {
          await tenantDao.findAndUpdateOneMultiple(
            { StripeSubscriptionId: subscriptionId } as any,
            {
              BMID,
              WABAID,
              WABAPhoneInfo: {
                id: WABAPhoneId,
                display_phone_number: WABAPhoneNumber,
                certificate: null,
                pin: '258012',
              },
            } as any,
          );

          steps.push({
            step: '5. Update Tenant (BMID + WABAPhoneInfo)',
            status: 'success',
            message: `Tenant updated — BMID: ${BMID}, WABAPhoneInfo.id: ${WABAPhoneId}, WABAPhoneInfo.display_phone_number: ${WABAPhoneNumber}`,
          });
        } catch (err) {
          failedSteps.push('5. Update Tenant');
          steps.push({
            step: '5. Update Tenant (BMID + WABAPhoneInfo)',
            status: 'failed',
            message: `Error updating tenant: ${err}`,
          });
        }

        // Step 6: Register phone via Meta Graph API
        try {
          const accessToken = process.env.FB_TOKEN;
          const url = `${META_GRAPH_API_BASE}/${WABAPhoneId}/register`;
          const payload = {
            messaging_product: 'whatsapp',
            pin: '258012',
          };

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            failedSteps.push('6. Register Phone');
            steps.push({
              step: '6. Register Phone (Meta API)',
              status: 'failed',
              message: `Phone registration failed: ${
                data.error?.message || JSON.stringify(data)
              }`,
              data,
            });
          } else {
            steps.push({
              step: '6. Register Phone (Meta API)',
              status: 'success',
              message: `Phone ${WABAPhoneId} registered successfully`,
            });
          }
        } catch (err) {
          failedSteps.push('6. Register Phone');
          steps.push({
            step: '6. Register Phone (Meta API)',
            status: 'failed',
            message: `Error registering phone: ${err}`,
          });
        }

        // Step 7: Update Settings — GeneralSetting fields
        try {
          const settingsModel = await settingsDao.initModel();
          await settingsModel.findOneAndUpdate(
            { TenantId: tenantId },
            {
              $set: {
                'GeneralSetting.WABusinessAccountId': WABAID,
                'GeneralSetting.CloudApiPhoneNumberId': WABAPhoneId,
                'GeneralSetting.IsOfflineModeEnabled': false,
              },
            },
            { new: true },
          );

          steps.push({
            step: '7. Update Settings (GeneralSetting)',
            status: 'success',
            message: `Settings updated — WABusinessAccountId: ${WABAID}, CloudApiPhoneNumberId: ${WABAPhoneId}, IsOfflineModeEnabled: false`,
          });
        } catch (err) {
          failedSteps.push('7. Update Settings');
          steps.push({
            step: '7. Update Settings (GeneralSetting)',
            status: 'failed',
            message: `Error updating settings: ${err}`,
          });
        }

        // Step 8: Clean cache
        try {
          const cleanCacheUrl = `${WATI_MT_SERVER_URL}/${tenantId}/api/v1/cleanCache`;
          const cacheResponse = await fetch(cleanCacheUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });

          if (cacheResponse.ok) {
            steps.push({
              step: '8. Clean Cache',
              status: 'success',
              message: `Cache cleaned successfully for tenant ${tenantId}`,
            });
          } else {
            failedSteps.push('8. Clean Cache');
            steps.push({
              step: '8. Clean Cache',
              status: 'failed',
              message: `Cache clean returned status ${cacheResponse.status}`,
            });
          }
        } catch (err) {
          failedSteps.push('8. Clean Cache');
          steps.push({
            step: '8. Clean Cache',
            status: 'failed',
            message: `Error cleaning cache: ${err}`,
          });
        }

        const allPassed = failedSteps.length === 0;
        const summaryMessage = allPassed
          ? 'Onboarding fix completed successfully — all steps passed'
          : `Onboarding fix completed with failures in: ${failedSteps.join(
              ', ',
            )}`;

        logger.info('Onboarding fix completed', {
          subscriptionId,
          tenantId,
          allPassed,
          failedSteps,
          loggerMetadata,
        });

        await insertAuditLog(
          tenantId,
          allPassed,
          allPassed ? null : failedSteps.join(', '),
          summaryMessage,
        );

        return res.status(allPassed ? 200 : 207).json({
          success: allPassed,
          message: summaryMessage,
          steps,
        });
      },
    ])(req, res);
  } catch (err) {
    logger.error('/api/onboardingFix/', { err: `${err}` });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      steps: [],
    });
  }
}
