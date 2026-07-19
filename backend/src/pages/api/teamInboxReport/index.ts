import type { NextApiRequest, NextApiResponse } from 'next';

import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { HttpMethod } from '@/enums/HttpMethod';
import { Role } from '@/enums/Role';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import type { EmptyPromiseFunction } from '@/types/EmptyPromiseFunction';
import { middlewareFlattener } from '@/utils/middlewareFlattener';

const DEFAULT_MT_SERVER = 'https://live-mt-server.wati.io';

type TeamInboxReportBody = {
  clientId?: unknown;
  bearerToken?: unknown;
  fromDate?: unknown;
  toDate?: unknown;
  timezone?: unknown;
};

type TeamInboxReportSuccess = {
  filename: string;
  contentType: string;
  csv: string;
  clientId: string;
  timezone: string;
  from: string;
  to: string;
};

type TeamInboxReportResponse = TeamInboxReportSuccess | { error: string };

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toStartOfDayIso(date: string): string {
  if (date.includes('T')) return new Date(date).toISOString();
  return `${date}T00:00:00.000Z`;
}

function toEndOfDayIso(date: string): string {
  if (date.includes('T')) return new Date(date).toISOString();
  return `${date}T23:59:59.000Z`;
}

function mtServerBase(): string {
  return (
    process.env.WATI_LIVE_MT_SERVER_URL?.trim() ||
    process.env.WATI_MT_SERVER_URL?.trim() ||
    DEFAULT_MT_SERVER
  ).replace(/\/$/, '');
}

function stripBearerPrefix(token: string): string {
  return token.replace(/^Bearer\s+/i, '').trim();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TeamInboxReportResponse>,
): Promise<void> {
  const { logger } = await getServerDiContainer();

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await middlewareFlattener<TeamInboxReportResponse>([
      createLogContextMiddleware(),
      createRbacMiddleware(
        [
          {
            httpMethod: HttpMethod.POST,
            roles: [Role.ADMIN],
          },
        ],
        BackofficeFeature.NO_FEATURE,
      ),
      async (
        request: NextApiRequest,
        response: NextApiResponse<TeamInboxReportResponse>,
        _next?: EmptyPromiseFunction,
      ): Promise<void> => {
        const body = (request.body ?? {}) as TeamInboxReportBody;
        const clientId = asTrimmedString(body.clientId);
        const bearerToken = stripBearerPrefix(asTrimmedString(body.bearerToken));
        const fromDate = asTrimmedString(body.fromDate);
        const toDate = asTrimmedString(body.toDate);
        const timezone = asTrimmedString(body.timezone) || 'UTC';

        if (!clientId) {
          response.status(400).json({ error: 'WATI Client ID is required' });
          return;
        }
        if (!/^\d+$/.test(clientId)) {
          response
            .status(400)
            .json({ error: 'WATI Client ID must be numeric' });
          return;
        }
        if (!bearerToken) {
          response.status(400).json({ error: 'Bearer Token is required' });
          return;
        }
        if (!fromDate || !toDate) {
          response
            .status(400)
            .json({ error: 'From Date and To Date are required' });
          return;
        }

        const from = toStartOfDayIso(fromDate);
        const to = toEndOfDayIso(toDate);
        if (Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
          response.status(400).json({ error: 'Invalid From Date or To Date' });
          return;
        }
        if (from > to) {
          response
            .status(400)
            .json({ error: 'From Date must be on or before To Date' });
          return;
        }

        const fromDay = Date.parse(from.slice(0, 10) + 'T00:00:00.000Z');
        const toDay = Date.parse(to.slice(0, 10) + 'T00:00:00.000Z');
        const daySpan =
          Math.floor((toDay - fromDay) / (24 * 60 * 60 * 1000)) + 1;
        if (daySpan > 7) {
          response.status(400).json({
            error: 'Date range cannot exceed 7 days',
          });
          return;
        }

        const url = `${mtServerBase()}/${clientId}/api/v1/dashboard/exportTicketsReportCSV`;
        const upstream = await fetch(url, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${bearerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenantId: clientId,
            selectedTimeZone: timezone,
            from,
            to,
          }),
        });

        const contentType =
          upstream.headers.get('content-type') || 'text/csv;charset=utf-8';
        const raw = await upstream.text();

        if (!upstream.ok) {
          let message = `Upstream request failed (${upstream.status})`;
          try {
            const parsed = JSON.parse(raw) as {
              message?: string;
              error?: string;
            };
            message = parsed.message || parsed.error || message;
          } catch {
            if (raw.trim()) {
              message = raw.trim().slice(0, 500);
            }
          }
          logger.error('teamInboxReport upstream error', {
            status: upstream.status,
            clientId,
            message,
          });
          response.status(upstream.status >= 400 && upstream.status < 600
            ? upstream.status
            : 502).json({ error: message });
          return;
        }

        const disposition = upstream.headers.get('content-disposition') || '';
        const filenameMatch = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(
          disposition,
        );
        const filename =
          filenameMatch?.[1]?.replace(/"/g, '') ||
          `team-inbox-report-${clientId}-${fromDate}_to_${toDate}.csv`;

        // If upstream returned JSON wrapping CSV, unwrap when possible.
        let csv = raw;
        if (contentType.includes('application/json')) {
          try {
            const parsed = JSON.parse(raw) as {
              csv?: string;
              data?: string;
              content?: string;
            };
            csv =
              parsed.csv ||
              parsed.data ||
              parsed.content ||
              raw;
          } catch {
            csv = raw;
          }
        }

        response.status(200).json({
          filename,
          contentType: contentType.includes('csv')
            ? contentType
            : 'text/csv;charset=utf-8',
          csv,
          clientId,
          timezone,
          from,
          to,
        });
      },
    ])(req, res);
  } catch (err) {
    logger.error('/api/teamInboxReport', { err: `${err}` });
    res.status(500).json({
      error:
        err instanceof Error ? err.message : 'Failed to export Team Inbox report',
    });
  }
}
