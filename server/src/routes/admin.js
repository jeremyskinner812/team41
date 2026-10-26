import { Router } from 'express';
import { body } from 'express-validator';
import * as admin from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { moneyBody, validate } from '../middleware/validate.js';
import { WEEKDAY_CODES } from '../services/marketService.js';

const router = Router();

const MAX_LISTING_PRICE_CENTS = 100000000; // $1,000,000.00
const MAX_TOTAL_VOLUME = 1000000000000;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

router.use(requireAuth, requireRole('admin'));

router.get('/stocks', admin.listStocks);

router.post(
  '/stocks',
  validate(
    body('ticker')
      .exists({ values: 'falsy' }).withMessage('is required').bail()
      .isString().withMessage('must be text').bail()
      .trim().toUpperCase()
      .matches(/^[A-Z]{1,5}(\.[A-Z]{1,2})?$/).withMessage('must be 1-5 letters, optionally with a class suffix like BRK.B'),
    body('companyName')
      .exists({ values: 'falsy' }).withMessage('is required').bail()
      .isString().withMessage('must be text').bail()
      .trim().isLength({ min: 1, max: 100 }).withMessage('must be 1-100 characters'),
    body('totalVolume')
      .exists({ values: 'null' }).withMessage('is required').bail()
      .isInt({ min: 1, max: MAX_TOTAL_VOLUME }).withMessage(`must be a whole number from 1 to ${MAX_TOTAL_VOLUME}`).bail()
      .toInt(),
    moneyBody('initialPrice', { maxCents: MAX_LISTING_PRICE_CENTS }),
  ),
  admin.createStock,
);

// Current hours, trading weekdays and holidays, so the settings page can show what's in force.
router.get('/market', admin.marketSettings);

router.put(
  '/market/hours',
  validate(
    body('openingTime').isString().bail().matches(TIME_PATTERN).withMessage('must be HH:MM (24-hour)'),
    body('closingTime').isString().bail().matches(TIME_PATTERN).withMessage('must be HH:MM (24-hour)'),
  ),
  admin.updateHours,
);

router.put(
  '/market/schedule',
  validate(
    body('tradingDays').isArray({ max: 7 }).withMessage('must be an array of weekday codes'),
    body('tradingDays.*')
      .isString().bail()
      .trim().toUpperCase()
      .isIn(WEEKDAY_CODES).withMessage(`must be one of ${WEEKDAY_CODES.join(', ')}`),
    body('holidays').isArray({ max: 366 }).withMessage('must be an array of { date, name }'),
    body('holidays.*.date').isISO8601({ strict: true }).withMessage('must be YYYY-MM-DD').bail()
      .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('must be YYYY-MM-DD'),
    body('holidays.*.name')
      .isString().withMessage('is required').bail()
      .trim().isLength({ min: 1, max: 100 }).withMessage('must be 1-100 characters'),
  ),
  admin.updateSchedule,
);

export default router;
