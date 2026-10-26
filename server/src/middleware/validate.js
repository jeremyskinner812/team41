import { body, matchedData, validationResult } from 'express-validator';
import { badRequest } from '../utils/errors.js';
import { isMoneyString, toCents } from '../utils/money.js';

// Runs the given express-validator chains, then fails with a single 400 listing every problem.
// Controllers read input through `validated(req)` so only checked, sanitized fields get through.
export function validate(...chains) {
  return [
    ...chains,
    (req, res, next) => {
      const result = validationResult(req);
      if (result.isEmpty()) return next();
      const details = result.array({ onlyFirstError: true }).map((e) => ({ field: e.path, message: e.msg }));
      const message = details.map((d) => `${d.field}: ${d.message}`).join('; ');
      return next(badRequest('VALIDATION_ERROR', message, details));
    },
  ];
}

// Express 5 makes req.query read-only, so sanitized values live only in matchedData.
export function validated(req) {
  return matchedData(req, { includeOptionals: false });
}

export function moneyBody(field, { maxCents }) {
  return body(field)
    .exists({ values: 'null' })
    .withMessage('is required')
    .bail()
    .custom((value) => {
      if (typeof value !== 'string' && typeof value !== 'number') throw new Error('must be a number');
      if (!isMoneyString(value)) throw new Error('must be a positive amount with at most 2 decimal places');
      const cents = toCents(value);
      if (cents <= 0) throw new Error('must be greater than 0');
      if (cents > maxCents) throw new Error(`must be at most ${(maxCents / 100).toFixed(2)}`);
      return true;
    })
    .customSanitizer((value) => String(value).trim());
}
