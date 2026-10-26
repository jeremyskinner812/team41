import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as orders from '../controllers/orderController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ORDER_STATUSES, ORDER_TYPES } from '../models/order.js';

const router = Router();

const MAX_ORDER_QUANTITY = 1000000;

// Admins manage the market but do not trade.
router.use(requireAuth, requireRole('customer'));

router.post(
  '/',
  validate(
    body('ticker')
      .exists({ values: 'falsy' }).withMessage('is required').bail()
      .isString().withMessage('must be text').bail()
      .trim().toUpperCase().matches(/^[A-Z.]{1,10}$/).withMessage('must be 1-10 letters'),
    body('orderType')
      .exists({ values: 'falsy' }).withMessage('is required').bail()
      .isString().withMessage('must be text').bail()
      .trim().toUpperCase().isIn(ORDER_TYPES).withMessage('must be BUY or SELL'),
    body('quantity')
      .exists({ values: 'null' }).withMessage('is required').bail()
      // Whole shares only: 1.5 is rejected, "10" is accepted and converted to 10.
      .isInt({ min: 1, max: MAX_ORDER_QUANTITY, allow_leading_zeroes: false })
      .withMessage(`must be a whole number from 1 to ${MAX_ORDER_QUANTITY}`).bail()
      .toInt(),
  ),
  orders.place,
);

router.get(
  '/',
  validate(
    query('status')
      .optional()
      .trim().toUpperCase()
      .isIn(ORDER_STATUSES).withMessage(`must be one of ${ORDER_STATUSES.join(', ')}`),
  ),
  orders.list,
);

router.delete(
  '/:id',
  validate(param('id').isInt({ min: 1 }).withMessage('must be a positive order id').bail().toInt()),
  orders.cancel,
);

export default router;
