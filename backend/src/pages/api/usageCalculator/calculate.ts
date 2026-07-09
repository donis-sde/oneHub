/* eslint-disable */
// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { BigQuery } from '@google-cloud/bigquery';
import { getWabaDiscountFromSheet } from '@/utils/wabaDiscountsSheet';
import { getInrToUsdRate } from '@/utils/usageCalculatorFxRate';

// Where the data lives (full path in queries; we only need Data Viewer on this project)
const BQ_ANALYTICS_PROJECT =
  process.env.BIGQUERY_PROJECT_ID ?? 'wati-analytics-prod';

const HOSTING_COST_USD = 10;
const SUPPORT_ONBOARDING_COST_USD = 4;
const PG_FEE_PERCENT = 6;

/** Map message type (frontend) to WABA discount type (BQ uppercase with underscores) */
function messageTypeToWabaType(messageType: string): string {
  return messageType.toUpperCase().replace(/-/g, '_');
}

const DECIMAL_PLACES = 6;
function round6(n: number): number {
  const factor = 10 ** DECIMAL_PLACES;
  return Math.round(n * factor) / factor;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body ?? {};
    const senderRegion = body.senderRegion as string;
    const recipientCountryCode = body.recipientCountryCode as string;
    const planType = body.planType as string;
    const discountPercent = Number(body.discountPercent);
    const messageType = body.messageType as string;
    const currency = (body.currency as string)?.toLowerCase();
    const planMRR = Number(body.planMRR) || 0;
    const addonMRR = Number(body.addonMRR) || 0;
    const messageVolumePerMonth =
      body.messageVolumePerMonth != null && body.messageVolumePerMonth !== ''
        ? Number(body.messageVolumePerMonth)
        : null;

    if (
      !senderRegion ||
      !recipientCountryCode ||
      !planType ||
      !messageType ||
      !currency
    ) {
      return res.status(400).json({
        error:
          'Missing required fields: senderRegion, recipientCountryCode, planType, messageType, currency',
      });
    }

    // No projectId: job runs in default project (Cloud Run project), we only read from BQ_ANALYTICS_PROJECT tables
    const bigquery = new BigQuery();

    // 1) Meta base price (current snapshot) by country code
    const basePriceQuery = `
      SELECT amount
      FROM \`${BQ_ANALYTICS_PROJECT}.stg_wati_snapshot.stg_message_base_prices_snapshot\`
      WHERE dbt_valid_to IS NULL
        AND recipient_country_code = @recipientCountryCode
        AND category = @category
        AND LOWER(currency) = @currency
      LIMIT 1
    `;
    const [basePriceRows] = await bigquery.query({
      query: basePriceQuery,
      params: {
        recipientCountryCode,
        category: messageType,
        currency,
      },
    });
    const metaBasePricePerMsg = (basePriceRows as { amount: number }[])[0]
      ?.amount;
    if (metaBasePricePerMsg == null) {
      return res.status(404).json({
        error: `No meta base price found for country code=${recipientCountryCode}, messageType=${messageType}, currency=${currency}`,
      });
    }

    // 2) Markup
    const markupQuery = `
      SELECT amount
      FROM \`${BQ_ANALYTICS_PROJECT}.stg_wati_snapshot.stg_message_markup_rates_snapshot\`
      WHERE dbt_valid_to IS NULL
        AND recipient_country_code = @recipientCountryCode
        AND category = @category
        AND plan_type = @planType
        AND LOWER(region) = @region
        AND LOWER(currency) = @currency
      LIMIT 1
    `;
    const [markupRows] = await bigquery.query({
      query: markupQuery,
      params: {
        recipientCountryCode,
        category: messageType,
        planType,
        region: senderRegion.toLowerCase(),
        currency,
      },
    });
    const markupPerMsg = (markupRows as { amount: number }[])[0]?.amount;
    if (markupPerMsg == null) {
      return res.status(404).json({
        error: `No markup found for region=${senderRegion}, countryCode=${recipientCountryCode}, planType=${planType}, messageType=${messageType}, currency=${currency}`,
      });
    }

    // 3) WABA discount (Meta partner discount %) – from Google Sheet via ADC (source of gs_wati.waba_discounts)
    const wabaType = messageTypeToWabaType(messageType);
    const metaPartnerDiscountPercent = await getWabaDiscountFromSheet(wabaType);
    const metaPartnerDiscountPercentVal =
      metaPartnerDiscountPercent != null
        ? Number(metaPartnerDiscountPercent)
        : 0;

    // --- Formulas ---
    const discountedMarkupPerMsg = round6(
      markupPerMsg * (1 - (discountPercent || 0) / 100),
    );
    const chargedAmountPerMsg = round6(
      discountedMarkupPerMsg + metaBasePricePerMsg,
    );
    const metaBasePriceAfterDiscountPerMsg = round6(
      metaBasePricePerMsg * (1 - metaPartnerDiscountPercentVal / 100),
    );
    const profitPerMsg = round6(
      chargedAmountPerMsg - metaBasePriceAfterDiscountPerMsg,
    );

    const response: Record<string, unknown> = {
      recipientCountryCode,
      metaBasePricePerMsg: round6(Number(metaBasePricePerMsg)),
      markupPerMsg: round6(Number(markupPerMsg)),
      discountedMarkupPerMsg,
      chargedAmountPerMsg,
      metaPartnerDiscountPercent: round6(metaPartnerDiscountPercentVal),
      metaBasePriceAfterDiscountPerMsg,
      profitPerMsg,
    };

    if (messageVolumePerMonth != null && messageVolumePerMonth > 0) {
      const totalChargedAmount = round6(
        messageVolumePerMonth * chargedAmountPerMsg,
      );
      const totalChargedMinusMetaBasePrice = round6(
        messageVolumePerMonth * profitPerMsg,
      );

      // INR → USD: use fixed rate from DB (default 0.012). Plan MRR and Addon MRR are always in USD.
      const inrToUsdRate = currency === 'inr' ? await getInrToUsdRate() : 1;
      const totalChargedAmountUSD =
        currency === 'usd'
          ? totalChargedAmount
          : round6(totalChargedAmount * inrToUsdRate);
      const totalChargedMinusMetaBasePriceUSD =
        currency === 'usd'
          ? totalChargedMinusMetaBasePrice
          : round6(totalChargedMinusMetaBasePrice * inrToUsdRate);

      const totalSubscriptionPlusUsageMRR = round6(
        planMRR + addonMRR + totalChargedMinusMetaBasePriceUSD,
      );

      const pgFeesSubs = round6((PG_FEE_PERCENT / 100) * (planMRR + addonMRR));
      const pgFeesUsage = round6(
        (PG_FEE_PERCENT / 100) * totalChargedAmountUSD,
      );
      const grossProfit = round6(
        totalSubscriptionPlusUsageMRR -
          (pgFeesSubs +
            pgFeesUsage +
            HOSTING_COST_USD +
            SUPPORT_ONBOARDING_COST_USD),
      );
      const grossMarginPercent =
        totalSubscriptionPlusUsageMRR > 0
          ? round6((grossProfit / totalSubscriptionPlusUsageMRR) * 100)
          : 0;

      response.totalChargedAmount = totalChargedAmount;
      response.totalChargedMinusMetaBasePrice = totalChargedMinusMetaBasePrice;
      response.totalChargedAmountUSD = totalChargedAmountUSD;
      response.totalChargedMinusMetaBasePriceUSD =
        totalChargedMinusMetaBasePriceUSD;
      response.totalSubscriptionPlusUsageMRR = totalSubscriptionPlusUsageMRR;
      response.costComponents = {
        pgFeesSubsMonthly: pgFeesSubs,
        pgFeesUsageMonthly: pgFeesUsage,
        hostingCostMonthly: HOSTING_COST_USD,
        supportOnboardingMonthly: SUPPORT_ONBOARDING_COST_USD,
      };
      response.grossProfit = grossProfit;
      response.grossMarginPercent = grossMarginPercent;
      if (currency === 'inr') {
        response.inrToUsdRate = inrToUsdRate;
      }
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error('Usage calculator error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
}
