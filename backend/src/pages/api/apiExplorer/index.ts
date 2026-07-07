/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { Role } from '@/enums/Role';
import { HttpMethod } from '@/enums/HttpMethod';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { validateApiExplorerRequest } from './validateRequest';
import { getServerDiContainer } from '@/global/serverDiContainer';

const rbacRules = [{ roles: [Role.ADMIN], httpMethod: HttpMethod.POST }];

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.API_EXPLORER,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  try {
    await rbacMiddleware(req, res, async () => {
      if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      const { method, url, headers, body } = req.body;

      // Validate request
      const validationResult = validateApiExplorerRequest({
        method,
        url,
        headers,
        body,
      });

      if (!validationResult.isValid) {
        res.status(400).json({ error: validationResult.error });
        return;
      }

      // Get user context for logging
      const userContext = req.logContext?.userContext;
      const requestedBy = userContext?.email || 'unknown';

      try {
        const startTime = Date.now();
        // Add FB_TOKEN as query parameter only for specific Meta API domains
        let requestUrl = url;
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        // Only add token for specific Meta API domains
        const allowedMetaDomains = [
          'graph.facebook.com',
          'graph.instagram.com',
          'graph.threads.net',
          'api.whatsapp.com',
        ];
        const isMetaApi = allowedMetaDomains.includes(hostname);
        if (isMetaApi) {
          const fbToken = process.env.FB_TOKEN;
          if (fbToken) {
            urlObj.searchParams.set('access_token', fbToken);
            requestUrl = urlObj.toString();
          }
        } else {
          res.status(403).json({ error: 'Not allowed to access this API' });
          return;
        }
        const response = await fetch(requestUrl, {
          method: method.toUpperCase(),
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: method !== 'GET' ? JSON.stringify(body) : undefined,
        });

        const responseTime = Date.now() - startTime;
        const responseText = await response.text();
        let responseData;

        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        // Log the API request
        try {
          const { apiExplorerLogDao } = await getServerDiContainer();
          await apiExplorerLogDao.insertMany([
            {
              method,
              url,
              requestHeaders: headers,
              requestBody: body,
              responseStatus: response.status,
              responseStatusText: response.statusText,
              responseHeaders,
              responseData,
              responseTime,
              responseSize: responseText.length,
              error: null,
              requestedBy,
              isMetaApi,
              timestamp: new Date(),
            },
          ]);
        } catch (logError) {
          console.error('Failed to log API Explorer request:', logError);
        }

        res.status(200).json({
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          data: responseData,
          responseTime,
          size: responseText.length,
        });
      } catch (error) {
        console.error('API Explorer proxy error:', error);

        // Log the failed API request
        try {
          const { apiExplorerLogDao } = await getServerDiContainer();
          await apiExplorerLogDao.insertMany([
            {
              method,
              url,
              requestHeaders: headers,
              requestBody: body,
              responseStatus: 500,
              responseStatusText: 'Internal Server Error',
              responseHeaders: {},
              responseData: null,
              responseTime: 0,
              responseSize: 0,
              error: error instanceof Error ? error.message : 'Unknown error',
              requestedBy,
              isMetaApi: false,
              timestamp: new Date(),
            },
          ]);
        } catch (logError) {
          console.error('Failed to log API Explorer error:', logError);
        }

        res.status(500).json({
          error: 'Failed to make request',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  } catch (error) {
    console.error('API Explorer RBAC error:', error);
    res.status(403).json({ error: 'Forbidden' });
  }
}
