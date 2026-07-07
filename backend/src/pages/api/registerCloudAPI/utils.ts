import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import winston from 'winston';
import { getEnv } from '@/utils/getEnv';

export const isValidPin = (pin: string | undefined): boolean => {
  if (!pin) return false;
  return (
    pin.length === 6 && pin.match(/^\d+$/) !== null && !pin.startsWith('0')
  );
};

export const generatePin = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const registerPhone = async (
  phoneId: string,
  pin: string | undefined,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<[boolean, string]> => {
  const clonedLoggerMetadata: BackofficePortalLoggingMetadata = {
    ...loggerMetadata,
    functionName: 'registerPhone',
  };

  const { FB_VERSION, FB_SYSTEM_TOKEN } = getEnv();
  const url = `https://graph.facebook.com/${FB_VERSION}/${phoneId}/register`;
  const body = {
    messaging_product: 'whatsapp',
    pin: pin,
  };
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${FB_SYSTEM_TOKEN}`,
  };

  logger.info(`register_phone ${url} ${body}`, {
    loggerMetadata: clonedLoggerMetadata,
  });

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  });
  const responseBody = await response.json();

  logger.info('register_phone response', {
    loggerMetadata: clonedLoggerMetadata,
    responseBody,
  });

  if (responseBody.success) {
    return [true, JSON.stringify(responseBody)];
  }
  return [false, JSON.stringify(responseBody)];
};

export const subscribeApp = async (
  wabaId: string | null,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata: BackofficePortalLoggingMetadata = {
    ...loggerMetadata,
    functionName: 'subscribeApp',
  };

  const { FB_VERSION, FB_SYSTEM_TOKEN } = getEnv();
  const url = `https://graph.facebook.com/${FB_VERSION}/${wabaId}/subscribed_apps`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${FB_SYSTEM_TOKEN}`,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
  });
  const responseBody = await response.json();

  logger.info(`subscribeApp response ${responseBody}`, {
    loggerMetadata: clonedLoggerMetadata,
  });
};
