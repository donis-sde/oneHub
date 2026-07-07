interface ApiExplorerRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateApiExplorerRequest(
  request: ApiExplorerRequest,
): ValidationResult {
  const { method, url, headers, body } = request;

  // Validate method
  const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  if (!allowedMethods.includes(method.toUpperCase())) {
    return {
      isValid: false,
      error: `Invalid HTTP method. Allowed methods: ${allowedMethods.join(
        ', ',
      )}`,
    };
  }

  // Validate URL
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      error: 'URL is required and must be a string',
    };
  }

  try {
    const urlObj = new URL(url);

    // Only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        isValid: false,
        error: 'Only HTTP and HTTPS protocols are allowed',
      };
    }
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid URL format',
    };
  }

  // Validate headers
  if (headers && typeof headers !== 'object') {
    return {
      isValid: false,
      error: 'Headers must be an object',
    };
  }

  // Validate body for non-GET requests
  if (method.toUpperCase() !== 'GET' && body !== undefined && body !== null) {
    if (typeof body !== 'object' && typeof body !== 'string') {
      return {
        isValid: false,
        error: 'Request body must be an object or string',
      };
    }
  }

  return { isValid: true };
}
