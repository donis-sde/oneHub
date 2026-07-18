import type { NextApiResponse } from 'next';

import {
  dailyAiUsageReportToCsv,
  getDailyAiUsageReport,
} from '@/dataAccess/AstraDailyAiUsageDao';
import { HttpMethod } from '@/enums/HttpMethod';
import { withAstraToolsAccess } from '@/pages/api/astra/_withAstraToolsAccess';

type DailyAiUsageResponse =
  | Awaited<ReturnType<typeof getDailyAiUsageReport>>
  | { error: string };

function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default withAstraToolsAccess<DailyAiUsageResponse>(
  HttpMethod.GET,
  async (req, res: NextApiResponse<DailyAiUsageResponse | string>) => {
    const fromRaw = req.query.fromDate ?? req.query.date;
    const toRaw = req.query.toDate ?? req.query.date;
    const tenantRaw = req.query.tenantId;
    const formatRaw = req.query.format;

    const fallback = yesterdayUtc();
    const fromDate =
      typeof fromRaw === 'string' && fromRaw.trim()
        ? fromRaw.trim()
        : fallback;
    const toDate =
      typeof toRaw === 'string' && toRaw.trim() ? toRaw.trim() : fromDate;
    const tenantId =
      typeof tenantRaw === 'string' ? tenantRaw.trim() : '';

    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }

    const format =
      typeof formatRaw === 'string' ? formatRaw.trim().toLowerCase() : 'json';

    const report = await getDailyAiUsageReport({
      fromDate,
      toDate,
      tenantId,
    });

    if (format === 'csv') {
      const csv = dailyAiUsageReportToCsv(report);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="astra-daily-ai-usage-${report.fromDate}_to_${report.toDate}.csv"`,
      );
      res.status(200).send(csv);
      return;
    }

    res.status(200).json(report);
  },
);
