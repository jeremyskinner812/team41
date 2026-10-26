import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
dotenv.config({ path: path.join(rootDir, '.env'), quiet: true });

const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET,
  priceTickCron: process.env.PRICE_TICK_CRON || '*/1 * * * *',
  priceMaxDriftPct: Number(process.env.PRICE_MAX_DRIFT_PCT) || 2,
  marketTimezone: 'America/Chicago',
};

export default env;
