import { Router } from 'express';
import { query } from 'express-validator';
import * as portfolio from '../controllers/portfolioController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { TRANSACTION_TYPES } from '../models/transaction.js';

// Mounted at /api so both /api/portfolio and /api/transactions live here.
const router = Router();

const customerOnly = [requireAuth, requireRole('customer')];

router.get('/portfolio', customerOnly, portfolio.portfolio);

router.get(
  '/transactions',
  customerOnly,
  validate(
    query('type')
      .optional()
      .trim().toUpperCase()
      .isIn(TRANSACTION_TYPES).withMessage(`must be one of ${TRANSACTION_TYPES.join(', ')}`),
    query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('must be 1-500').bail().toInt(),
  ),
  portfolio.transactions,
);

export default router;
