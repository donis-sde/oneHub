/* eslint-disable */
// @ts-nocheck
import { MongoClient } from 'mongodb';
import { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { Role } from '@/enums/Role';
import { HttpMethod } from '@/enums/HttpMethod';
import { BackofficeFeature } from '@/enums/BackofficeFeature';

const rbacRules = [
  {
    roles: [Role.ADMIN],
    httpMethod: HttpMethod.POST,
  },
];

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.MANAGE_SUBSCRIPTION,
);
const WATI_BE_SECURE_REQUEST_KEY = process.env.WATI_BE_SECURE_REQUEST_KEY;
const WATI_MT_SERVER_URL = process.env.WATI_MT_SERVER_URL;
const WATI_CHARGEBEE_WEBSITE_URL = process.env.WATI_CHARGEBEE_WEBSITE_URL;
const CHARGEBEE_API_TOKEN = process.env.CHARGEBEE_API_TOKEN;
const MT_DB_URL = process.env.DB_URL;
const MT_DB_NAME = process.env.MT_DB_NAME;
const NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION =
  process.env.NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION;

function prePareSignatureCode(): string {
  const timestamp = Math.floor(new Date().getTime() / 1000).toString();
  const keyString = createMD5Hash(`${WATI_BE_SECURE_REQUEST_KEY}:${timestamp}`);

  return `${keyString}:${timestamp}`;
}

function createMD5Hash(input: string): string {
  const md5 = createHash('md5');
  let result = md5.update(input, 'ascii').digest('hex');
  return result.toUpperCase();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    await rbacMiddleware(req, res, async () => {
      const disableTenantFeatureApiEndpoint =
        'api/v1/setting/disableTenantFeature';
      const {
        tenantId,
        shouldCancelChargebee,
        chargebeeCancellationReason,
        subscriptionId,
        manageSubscriptionAction,
      } = req.body;
      const cancelChargebeeApiEndpoint = `api/v2/subscriptions/${subscriptionId}/cancel_for_items`;
      const disableTenantFeatureRequest = {
        DisableWebhook: true,
        DisableRecurringJob: true,
        DisableAPIAccess: true,
        IsTerminate: true,
      };
      const cancelChargebeeRequest = {
        end_of_term: false,
        cancel_reason_code: chargebeeCancellationReason,
      };
      try {
        const client = new MongoClient(MT_DB_URL, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        await client.connect();
        const db = client.db(MT_DB_NAME);
        const tenantsCollection = db.collection(
          NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION,
        );
        const existingTenant = await tenantsCollection.findOne({
          StripeSubscriptionId: subscriptionId,
        });
        if (shouldCancelChargebee || manageSubscriptionAction === 'pause') {
          console.log('tenant to be terminated', tenantId);
          const disableTenantfeatureApiUrl = `${WATI_MT_SERVER_URL}/${tenantId}/${disableTenantFeatureApiEndpoint}`;
          const cancelChargebeeApiUrl = `${WATI_CHARGEBEE_WEBSITE_URL}/${cancelChargebeeApiEndpoint}`;
          console.log('api url', disableTenantfeatureApiUrl);
          var signature = prePareSignatureCode();
          console.log('signature', signature);
          const apiResponse = await fetch(disableTenantfeatureApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Signature: signature,
            },
            body: JSON.stringify(disableTenantFeatureRequest),
          });
          console.log(apiResponse);

          if (apiResponse.statusText != 'OK') {
            return res
              .status(apiResponse.status)
              .json({ error: apiResponse.statusText });
          }

          const disableTenantresponseData = await apiResponse.json();
          console.log('apiResponse', disableTenantresponseData);
          const secondDisableTenantFeatureRequest = {
            ...disableTenantFeatureRequest,
            IsTerminate: false,
          };
          var signature = prePareSignatureCode();
          console.log('signature', signature);
          const secondApiResponse = await fetch(disableTenantfeatureApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Signature: signature,
            },
            body: JSON.stringify(secondDisableTenantFeatureRequest),
          });
          console.log(secondApiResponse);
          if (!secondApiResponse.ok) {
            return res
              .status(secondApiResponse.status)
              .json({ error: secondApiResponse.statusText });
          }
          const secondDisableTenantResponseData =
            await secondApiResponse.json();
          console.log('Second API Response:', secondDisableTenantResponseData);
          if (
            existingTenant &&
            existingTenant.State === 'Terminated' &&
            shouldCancelChargebee != 'true'
          ) {
            return res
              .status(208)
              .json({ error: 'Tenant is already terminated' });
          }
          var response = await tenantsCollection.updateOne(
            { StripeSubscriptionId: subscriptionId },
            { $set: { State: 'Terminated', IsDeleted: true } },
          );
          console.log(
            'Tenant %s state updated to Terminated',
            tenantId,
            response,
          );

          if (shouldCancelChargebee == 'true') {
            // we should pass body in urlEncoded form
            const urlEncodedChargebeeBody = new URLSearchParams();
            urlEncodedChargebeeBody.append(
              'end_of_term',
              cancelChargebeeRequest.end_of_term,
            );
            urlEncodedChargebeeBody.append(
              'cancel_reason_code',
              cancelChargebeeRequest.cancel_reason_code,
            );

            const chargebeeApiResponse = await fetch(cancelChargebeeApiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization:
                  'Basic ' +
                  Buffer.from(CHARGEBEE_API_TOKEN + ':').toString('base64'),
              },
              body: urlEncodedChargebeeBody.toString(),
            });
            const chargebeeResponseData = await chargebeeApiResponse.json();
            console.log('chargebeeApiResonse', chargebeeApiResponse);
            return res
              .status(chargebeeApiResponse.status)
              .json({ disableTenantresponseData, chargebeeResponseData });
          }

          return res.status(apiResponse.status).json(disableTenantresponseData);
        } else if (manageSubscriptionAction === 'resume') {
          const enableTenantfeatureApiUrl = `${WATI_MT_SERVER_URL}/${tenantId}/api/v1/setting/enableTenantFeature`;
          const signature = prePareSignatureCode();
          const apiResponse = await fetch(enableTenantfeatureApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Signature: signature,
            },
          });
          const enableTenantResult = await apiResponse.json();

          await tenantsCollection.updateOne(
            { StripeSubscriptionId: subscriptionId },
            { $set: { State: 'AUTOMATED_REGISTERED', IsDeleted: false } },
          );

          return res.status(200).json(enableTenantResult);
        } else {
          throw new Exception('Unknown manage subscription action');
        }
        await client.close();
      } catch (error) {
        console.log('error we got', error);
        console.error('Error In disabling the tenant feature', error);
        res.status(500).json(error);
      }
    });
  } catch (error) {
    console.error('RBAC middleware error:', error);
    res.status(403).json({ error: 'Forbidden' });
  }
}
