import type { NextApiRequest, NextApiResponse } from 'next';
import https from 'https';

interface UpdateIsSubOnlyRequest {
  groupSlug: string;
  isSubOnly: boolean;
}

interface UpdateIsSubOnlyResponse {
  message: string;
  traceId?: string;
  group?: {
    key: string;
    name: string;
    slug: string;
    isSubOnly: boolean;
    lastUpdated: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateIsSubOnlyResponse | { error: string }>,
): Promise<void> {
  if (req.method !== 'PATCH') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { groupSlug, isSubOnly } = req.body as UpdateIsSubOnlyRequest;

    // Validate request body
    if (!groupSlug || typeof groupSlug !== 'string') {
      res
        .status(400)
        .json({ error: 'groupSlug is required and must be a string' });
      return;
    }

    if (typeof isSubOnly !== 'boolean') {
      res
        .status(400)
        .json({ error: 'isSubOnly is required and must be a boolean' });
      return;
    }

    // Get partnership service URL from environment
    const partnershipServiceUrl = process.env.PARTNERSHIP_SERVICE_URL;

    if (!partnershipServiceUrl) {
      res.status(500).json({
        error: 'PARTNERSHIP_SERVICE_URL environment variable is not set',
      });
      return;
    }

    // Remove trailing slash if present and construct URL
    const baseUrl = partnershipServiceUrl.trim().replace(/\/$/, '');
    const url = `${baseUrl}/api/v1/Partner/UpdateGroupIsSubOnly`;

    console.log('Updating IsSubOnly at:', url, { groupSlug, isSubOnly });

    const isLocalhost =
      baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

    const requestBody = JSON.stringify({ groupSlug, isSubOnly });

    // First, try the HTTP request
    let response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
      redirect: 'manual', // Handle redirects manually
    });

    // Handle redirects (3xx status codes like 307)
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        console.log('Following redirect to:', location);

        // If redirecting to HTTPS with localhost, use https module with SSL verification disabled
        if (location.startsWith('https://') && isLocalhost) {
          const redirectUrl = new URL(location);
          const httpsAgent = new https.Agent({
            rejectUnauthorized: false, // Allow self-signed certificates for localhost
          });

          const options = {
            hostname: redirectUrl.hostname,
            port: redirectUrl.port || 443,
            path: redirectUrl.pathname + redirectUrl.search,
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(requestBody),
            },
            agent: httpsAgent,
          };

          const data = await new Promise<string>((resolve, reject) => {
            const req = https.request(options, (res) => {
              let data = '';
              res.on('data', (chunk) => {
                data += chunk;
              });
              res.on('end', () => {
                if (
                  res.statusCode &&
                  res.statusCode >= 200 &&
                  res.statusCode < 300
                ) {
                  resolve(data);
                } else {
                  reject(
                    new Error(
                      `HTTP ${res.statusCode}: ${
                        res.statusMessage || 'Unknown error'
                      }`,
                    ),
                  );
                }
              });
            });
            req.on('error', reject);
            req.write(requestBody);
            req.end();
          });

          const jsonData = JSON.parse(data);
          res.status(200).json(jsonData);
          return;
        } else {
          // For non-localhost or non-HTTPS redirects, use regular fetch
          response = await fetch(location, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: requestBody,
          });
        }
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Partnership service error:', errorText);
      res.status(response.status).json({
        error: `Failed to update IsSubOnly: ${response.statusText}`,
      });
      return;
    }

    const data = await response.json();
    console.log('Partnership service response:', JSON.stringify(data, null, 2));
    res.status(200).json(data);
  } catch (error: Error | unknown) {
    console.error('Error updating IsSubOnly:', error);

    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
      errorMessage = error.message;

      // Check for connection errors
      const cause = (error as Error & { cause?: { code?: string } }).cause;
      if (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('fetch failed') ||
        (cause && cause.code === 'ECONNREFUSED')
      ) {
        const serviceUrl = process.env.PARTNERSHIP_SERVICE_URL || 'not set';
        errorMessage = `Unable to connect to partnership service at ${serviceUrl}. Please ensure the service is running.`;
      } else if (
        error.message.includes('self-signed certificate') ||
        error.message.includes('DEPTH_ZERO_SELF_SIGNED_CERT') ||
        (cause && cause.code === 'DEPTH_ZERO_SELF_SIGNED_CERT')
      ) {
        errorMessage =
          'SSL certificate error. The service redirected to HTTPS with a self-signed certificate.';
      }
    }

    res.status(500).json({ error: errorMessage });
  }
}
