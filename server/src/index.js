import app from './app.js';
import env from './config/env.js';
import { sequelize } from './models/index.js';
import { startPriceGenerator } from './jobs/priceGenerator.js';

async function start() {
  if (!env.jwtSecret) {
    console.error('[api] JWT_SECRET is not set; copy .env.example to .env (see README).');
    process.exit(1);
  }
  if (env.nodeEnv === 'production' && env.jwtSecret === 'change_me') {
    console.error('[api] refusing to start in production with the placeholder JWT_SECRET.');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    const { database, host, port } = sequelize.config;
    console.log(`[db] connected to mysql://${host}:${port}/${database}`);
  } catch (err) {
    // Fail fast: every route depends on the database, so a half-up API would only confuse a demo.
    console.error(`[db] connection failed: ${err.message}`);
    console.error('[db] check DB_* values in .env and that MySQL is running (see README).');
    process.exit(1);
  }

  let priceTask = null;
  // Express 5 also calls this callback on failure (e.g. EADDRINUSE); the 'error' handler below exits.
  const server = app.listen(env.port, (err) => {
    if (err) return;
    console.log(`[api] listening on http://localhost:${env.port} (${env.nodeEnv})`);
    // Only a server that actually owns the port runs the generator, so a stray second copy
    // can't tick prices alongside the real one.
    priceTask = startPriceGenerator();
  });
  server.on('error', (err) => {
    const hint = err.code === 'EADDRINUSE' ? ' (is another copy of the server already running?)' : '';
    console.error(`[api] could not listen on port ${env.port}: ${err.message}${hint}`);
    process.exit(1);
  });

  const shutdown = async () => {
    priceTask?.stop();
    server.close();
    await sequelize.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

process.on('unhandledRejection', (reason) => {
  console.error('[api] unhandled rejection:', reason);
});

start();
