/* eslint-disable */
// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { BigQuery } from '@google-cloud/bigquery';

const BQ_ANALYTICS_PROJECT =
  process.env.BIGQUERY_PROJECT_ID ?? 'wati-analytics-prod';

/** GET: returns latest CB FX rates from BQ (stg_chargebee_exchange_rate) for the CB Latest FX Rate table */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const bigquery = new BigQuery();
    const query = `
      SELECT currency_code, exchange_rate
      FROM \`${BQ_ANALYTICS_PROJECT}.stg_wati_api_sources.stg_chargebee_exchange_rate\`
      WHERE reporting_date = (
        SELECT MAX(reporting_date)
        FROM \`${BQ_ANALYTICS_PROJECT}.stg_wati_api_sources.stg_chargebee_exchange_rate\`
      )
      ORDER BY currency_code
    `;
    const [rows] = await bigquery.query({ query });
    const rates = (
      rows as { currency_code: string; exchange_rate: number }[]
    ).map((r) => ({
      currency_code: r.currency_code,
      exchange_rate: Number(r.exchange_rate),
    }));

    return res.status(200).json({ rows: rates });
  } catch (err) {
    console.error('Usage calculator cbFxRates error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to fetch FX rates',
    });
  }
}
