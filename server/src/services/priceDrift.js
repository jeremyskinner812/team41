// Pure price math for the generator: no database, no clock, randomness injected so tests can
// pin it. All arithmetic is in integer cents; inputs and outputs are "0.00" strings.
import { fromCents, toCents } from '../utils/money.js';

export const MIN_PRICE_CENTS = 1; // $0.01: a price can never reach zero.
export const MAX_ALLOWED_DRIFT_PCT = 10;

export function assertValidDriftPct(maxDriftPct) {
  if (!Number.isFinite(maxDriftPct) || maxDriftPct <= 0 || maxDriftPct > MAX_ALLOWED_DRIFT_PCT) {
    throw new RangeError(`PRICE_MAX_DRIFT_PCT must be > 0 and <= ${MAX_ALLOWED_DRIFT_PCT}, got ${maxDriftPct}`);
  }
}

// One random step of at most ±maxDriftPct. `random` returns [0, 1), like Math.random.
// The move is truncated toward zero rather than rounded, so rounding to whole cents can never push
// a step past the bound. The trade-off: below ~$0.50 at 2% a step is under a cent and the price
// holds still.
export function applyPriceDrift(priceCents, { maxDriftPct, random = Math.random }) {
  assertValidDriftPct(maxDriftPct);
  if (!Number.isSafeInteger(priceCents) || priceCents < MIN_PRICE_CENTS) {
    throw new RangeError(`priceCents must be a positive integer, got ${priceCents}`);
  }
  const drift = (random() * 2 - 1) * (maxDriftPct / 100);
  const deltaCents = Math.trunc(priceCents * drift);
  return Math.max(MIN_PRICE_CENTS, priceCents + deltaCents);
}

// Next state for one stock on one tick.
// On the first tick of a trading session the previous price becomes that day's opening price, and
// high/low restart from it; after that, high/low only widen to include each new price.
export function nextPriceState(stock, { isNewSession, maxDriftPct, random = Math.random }) {
  const previousCents = toCents(stock.currentPrice);
  const nextCents = applyPriceDrift(previousCents, { maxDriftPct, random });

  const openingCents = isNewSession || stock.openingPrice == null ? previousCents : toCents(stock.openingPrice);
  const highCents = isNewSession || stock.dailyHigh == null ? openingCents : toCents(stock.dailyHigh);
  const lowCents = isNewSession || stock.dailyLow == null ? openingCents : toCents(stock.dailyLow);

  return {
    currentPrice: fromCents(nextCents),
    openingPrice: fromCents(openingCents),
    dailyHigh: fromCents(Math.max(highCents, nextCents)),
    dailyLow: fromCents(Math.min(lowCents, nextCents)),
  };
}
