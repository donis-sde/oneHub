import type { NextApiRequest, NextApiResponse } from 'next';
import https from 'https';

interface PartnerResponse {
  Items: unknown[];
  TotalCount: number;
  Page: number;
  PageSize: number;
  TotalPages: number;
  Filters?: {
    PartnerType?: string;
    Search?: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PartnerResponse | { error: string }>,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { page = '1', pageSize = '20', partnerType, search } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSizeNum = Math.min(
      100,
      Math.max(1, parseInt(pageSize as string, 10) || 20),
    );

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

    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('page', pageNum.toString());
    queryParams.append('pageSize', pageSizeNum.toString());

    // Add optional filter parameters
    if (partnerType && typeof partnerType === 'string' && partnerType.trim()) {
      queryParams.append('partnerType', partnerType.trim());
    }

    if (search && typeof search === 'string' && search.trim()) {
      queryParams.append('search', search.trim());
    }

    const url = `${baseUrl}/api/v1/Partner/GetAll?${queryParams.toString()}`;

    console.log('Fetching partners from:', url);

    const isLocalhost =
      baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

    // First, try the HTTP request
    let response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
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
            req.end();
          });

          const jsonData = JSON.parse(data);
          res.status(200).json(jsonData);
          return;
        } else {
          // For non-localhost or non-HTTPS redirects, use regular fetch
          response = await fetch(location, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Partnership service error:', errorText);
      res.status(response.status).json({
        error: `Failed to fetch partners: ${response.statusText}`,
      });
      return;
    }

    const data = await response.json();
    console.log(
      'Partnership service response - partners count:',
      data.Items?.length || 0,
      'total:',
      data.TotalCount,
      'filters:',
      data.Filters,
    );
    res.status(200).json(data);
  } catch (error: Error | unknown) {
    console.error('Error fetching partners:', error);

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
