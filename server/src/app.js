import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import env from './config/env.js';
import { sequelize } from './models/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';

// Built separately from index.js so supertest can drive the app without opening a port.
const app = express();

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', async (req, res) => {
  let database = 'up';
  try {
    await sequelize.authenticate();
  } catch {
    database = 'down';
  }
  res.status(database === 'up' ? 200 : 503).json({
    status: database === 'up' ? 'ok' : 'degraded',
    database,
    time: new Date().toISOString(),
  });
});

app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
