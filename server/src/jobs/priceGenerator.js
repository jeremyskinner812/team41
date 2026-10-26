import cron from 'node-cron';
import env from '../config/env.js';
import { runPriceTick } from '../services/pricingService.js';
import { assertValidDriftPct } from '../services/priceDrift.js';

// Thin scheduler: all price logic lives in services/pricingService.js and services/priceDrift.js.
export function startPriceGenerator({ schedule = env.priceTickCron, maxDriftPct = env.priceMaxDriftPct } = {}) {
  if (!cron.validate(schedule)) throw new Error(`PRICE_TICK_CRON is not a valid cron expression: "${schedule}"`);
  assertValidDriftPct(maxDriftPct);

  // Only log skips when the reason changes, so a closed weekend isn't a wall of logs.
  let lastSkipReason = null;

  const task = cron.schedule(
    schedule,
    async () => {
      try {
        const result = await runPriceTick({ maxDriftPct });
        if (result.ran) {
          lastSkipReason = null;
          console.log(`[prices] tick: updated ${result.updated} stocks`);
        } else if (result.reason !== lastSkipReason) {
          lastSkipReason = result.reason;
          console.log(`[prices] skipping tick: ${result.reason}`);
        }
      } catch (err) {
        console.error('[prices] tick failed:', err);
      }
    },
    { name: 'price-generator', noOverlap: true },
  );

  console.log(`[prices] generator scheduled "${schedule}", max drift ±${maxDriftPct}% per tick`);
  return task;
}
