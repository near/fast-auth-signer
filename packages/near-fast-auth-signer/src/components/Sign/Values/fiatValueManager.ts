import { stringifyUrl } from 'query-string';

// @ts-ignore
import sendJson from './tmp_fetch_send_json';

const COINGECKO_PRICE_URL = 'https://api.coingecko.com/api/v3/simple/price';
const ACCOUNT_ID_SUFFIX = 'mainnet';
const REF_FINANCE_API_ENDPOINT = `https://${ACCOUNT_ID_SUFFIX}-indexer.ref-finance.com/`;

export const fetchGeckoPrices = async (tokenIds) => {
  try {
    const tokenFiatValues = await sendJson(
      'GET',
      stringifyUrl({
        url:   COINGECKO_PRICE_URL,
        query: {
          ids:                     tokenIds,
          vs_currencies:           'usd',
          include_last_updated_at: true,
        },
      })
    );
    return tokenFiatValues;
  } catch (error) {
    return console.error(`Failed to fetch coingecko prices: ${error}`);
  }
};

export const fetchRefFinancePrices = async () => {
  try {
    const refFinanceTokenFiatValues = await sendJson(
      'GET',
      `${REF_FINANCE_API_ENDPOINT}/list-token-price`
    );
    const [prices] = [refFinanceTokenFiatValues];

    const last_updated_at = Date.now() / 1000;

    const formattedValues =      refFinanceTokenFiatValues
      && Object.keys(prices).reduce((acc, curr) => {
        return {
          ...acc,
          [curr]: {
            usd: +Number(prices[curr]?.price).toFixed(2) || null,
            last_updated_at,
          },
        };
      }, {});

    return {
      near: formattedValues['wrap.near'],
    };
  } catch (error) {
    return console.warn(`Failed to fetch ref-finance prices: ${error}`);
  }
};
