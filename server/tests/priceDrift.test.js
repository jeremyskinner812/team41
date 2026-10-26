import { applyPriceDrift, MIN_PRICE_CENTS, nextPriceState } from '../src/services/priceDrift.js';

// random() values that map to an exact drift: 0 -> -max, 0.5 -> 0, just under 1 -> +max.
const fixed = (value) => () => value;
const ALMOST_ONE = 1 - Number.EPSILON;

// Small deterministic PRNG so the property tests are reproducible.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('applyPriceDrift', () => {
  test('a mid-range random value leaves the price unchanged', () => {
    expect(applyPriceDrift(10000, { maxDriftPct: 2, random: fixed(0.5) })).toBe(10000);
  });

  test('the extremes move exactly the maximum percentage', () => {
    expect(applyPriceDrift(10000, { maxDriftPct: 2, random: fixed(0) })).toBe(9800);
    expect(applyPriceDrift(10000, { maxDriftPct: 2, random: fixed(ALMOST_ONE) })).toBe(10199);
  });

  test('never moves more than maxDriftPct in a single step, at any price', () => {
    const random = seeded(42);
    for (const start of [1, 7, 26, 99, 4999, 23215, 61245, 999999999]) {
      let price = start;
      for (let i = 0; i < 2000; i += 1) {
        const next = applyPriceDrift(price, { maxDriftPct: 2, random });
        expect(Math.abs(next - price)).toBeLessThanOrEqual(price * 0.02);
        price = next;
      }
    }
  });

  test('clamps to $0.01 and never reaches zero or below', () => {
    expect(applyPriceDrift(MIN_PRICE_CENTS, { maxDriftPct: 10, random: fixed(0) })).toBe(MIN_PRICE_CENTS);
    const random = seeded(7);
    let price = 50;
    for (let i = 0; i < 5000; i += 1) {
      price = applyPriceDrift(price, { maxDriftPct: 10, random: () => random() * 0.2 }); // biased down
      expect(price).toBeGreaterThanOrEqual(MIN_PRICE_CENTS);
    }
  });

  test('always returns whole cents', () => {
    const random = seeded(3);
    for (let i = 0; i < 1000; i += 1) {
      expect(Number.isInteger(applyPriceDrift(12345, { maxDriftPct: 2, random }))).toBe(true);
    }
  });

  test('rejects an invalid drift setting or price', () => {
    expect(() => applyPriceDrift(100, { maxDriftPct: 0 })).toThrow(RangeError);
    expect(() => applyPriceDrift(100, { maxDriftPct: 50 })).toThrow(RangeError);
    expect(() => applyPriceDrift(100, { maxDriftPct: Number.NaN })).toThrow(RangeError);
    expect(() => applyPriceDrift(0, { maxDriftPct: 2 })).toThrow(RangeError);
    expect(() => applyPriceDrift(1.5, { maxDriftPct: 2 })).toThrow(RangeError);
  });
});

describe('nextPriceState', () => {
  const yesterday = { currentPrice: '100.00', openingPrice: '95.00', dailyHigh: '120.00', dailyLow: '90.00' };

  test('first tick of a session: opening = previous price, high/low restart from it', () => {
    const up = nextPriceState(yesterday, { isNewSession: true, maxDriftPct: 2, random: fixed(ALMOST_ONE) });
    expect(up).toEqual({ currentPrice: '101.99', openingPrice: '100.00', dailyHigh: '101.99', dailyLow: '100.00' });

    const down = nextPriceState(yesterday, { isNewSession: true, maxDriftPct: 2, random: fixed(0) });
    expect(down).toEqual({ currentPrice: '98.00', openingPrice: '100.00', dailyHigh: '100.00', dailyLow: '98.00' });
  });

  test('later ticks keep the opening price and only widen high/low', () => {
    const intraday = { currentPrice: '100.00', openingPrice: '99.00', dailyHigh: '101.00', dailyLow: '98.50' };
    const inside = nextPriceState(intraday, { isNewSession: false, maxDriftPct: 2, random: fixed(0.5) });
    expect(inside).toEqual({ currentPrice: '100.00', openingPrice: '99.00', dailyHigh: '101.00', dailyLow: '98.50' });

    const newHigh = nextPriceState(intraday, { isNewSession: false, maxDriftPct: 2, random: fixed(ALMOST_ONE) });
    expect(newHigh).toMatchObject({ currentPrice: '101.99', openingPrice: '99.00', dailyHigh: '101.99', dailyLow: '98.50' });

    const newLow = nextPriceState(intraday, { isNewSession: false, maxDriftPct: 2, random: fixed(0) });
    expect(newLow).toMatchObject({ currentPrice: '98.00', openingPrice: '99.00', dailyHigh: '101.00', dailyLow: '98.00' });
  });

  test('a long session keeps low <= opening, current <= high and every price positive', () => {
    const random = seeded(99);
    let state = nextPriceState(yesterday, { isNewSession: true, maxDriftPct: 2, random });
    const seen = [Number(state.openingPrice), Number(state.currentPrice)];
    for (let i = 0; i < 390; i += 1) {
      state = nextPriceState(state, { isNewSession: false, maxDriftPct: 2, random });
      seen.push(Number(state.currentPrice));
    }
    expect(Number(state.dailyHigh)).toBe(Math.max(...seen));
    expect(Number(state.dailyLow)).toBe(Math.min(...seen));
    expect(state.openingPrice).toBe('100.00');
    expect(Math.min(...seen)).toBeGreaterThan(0);
  });

  test('a stock with no opening/high/low yet treats its current price as the open', () => {
    const fresh = { currentPrice: '50.00', openingPrice: null, dailyHigh: null, dailyLow: null };
    expect(nextPriceState(fresh, { isNewSession: false, maxDriftPct: 2, random: fixed(0.5) })).toEqual({
      currentPrice: '50.00', openingPrice: '50.00', dailyHigh: '50.00', dailyLow: '50.00',
    });
  });
});
