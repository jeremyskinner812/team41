import { Router } from 'express';
import { param, query } from 'express-validator';
import * as stocks from '../controllers/stockController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const tickerParam = () =>
  param('ticker').trim().toUpperCase().matches(/^[A-Z.]{1,10}$/).withMessage('must be 1-10 letters');

router.use(requireAuth);

router.get('/', stocks.list);
router.get('/:ticker', validate(tickerParam()), stocks.detail);
router.get(
  '/:ticker/history',
  validate(
    tickerParam(),
    query('from').optional().isISO8601().withMessage('must be an ISO 8601 date').bail().toDate(),
    query('to').optional().isISO8601().withMessage('must be an ISO 8601 date').bail().toDate(),
    query('limit').optional().isInt({ min: 1, max: 5000 }).withMessage('must be 1-5000').bail().toInt(),
  ),
  stocks.history,
);

export default router;
