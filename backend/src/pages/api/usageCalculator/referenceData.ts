/* eslint-disable */
// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { BigQuery } from '@google-cloud/bigquery';

const BQ_ANALYTICS_PROJECT =
  process.env.BIGQUERY_PROJECT_ID ?? 'wati-analytics-prod';

/** GET: returns country names for dropdown (from BQ, matching base price snapshot availability) */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // No projectId: job runs in default project (Cloud Run), we only read from BQ_ANALYTICS_PROJECT
    const bigquery = new BigQuery();

    const query = `
      SELECT DISTINCT c.country_name
      FROM \`${BQ_ANALYTICS_PROJECT}.stg_wati_snapshot.stg_message_base_prices_snapshot\` AS m
      INNER JOIN \`${BQ_ANALYTICS_PROJECT}.raw_static_data_wati.country_alpha_codes\` AS c
        ON m.recipient_country_code = c.alpha_2_code
      WHERE m.dbt_valid_to IS NULL
        AND c.country_name IS NOT NULL
      ORDER BY c.country_name
    `;
    const [rows] = await bigquery.query({ query });
    const countryNames = (rows as { country_name: string }[]).map(
      (r) => r.country_name,
    );

    return res.status(200).json({ countryNames });
  } catch (err) {
    console.error('Usage calculator referenceData error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
}
