import { utils } from 'near-api-js';

const NEAR_FRACTIONAL_DIGITS = 5;

export const formatNearAmount = (amount) => {
  amount = amount.toString();
  if (amount === '0') {
    return amount;
  }
  const formattedAmount = utils.format.formatNearAmount(amount, NEAR_FRACTIONAL_DIGITS);
  if (formattedAmount === '0') {
    return `< ${!NEAR_FRACTIONAL_DIGITS ? '0' : `0.${'0'.repeat((NEAR_FRACTIONAL_DIGITS || 1) - 1)}1`}`;
  }
  return formattedAmount;
};
