import { Router } from 'express';
import { body } from 'express-validator';
import * as auth from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const requiredText = (field) =>
  body(field)
    .exists({ values: 'falsy' }).withMessage('is required').bail()
    .isString().withMessage('must be text').bail();

router.post(
  '/register',
  validate(
    requiredText('firstName').trim().isLength({ min: 1, max: 50 }).withMessage('must be 1-50 characters'),
    requiredText('lastName').trim().isLength({ min: 1, max: 50 }).withMessage('must be 1-50 characters'),
    requiredText('username')
      .trim()
      .matches(/^[A-Za-z0-9_]{3,50}$/).withMessage('must be 3-50 letters, numbers or underscores'),
    requiredText('email')
      .trim()
      .isLength({ max: 100 }).withMessage('must be at most 100 characters').bail()
      .isEmail().withMessage('must be a valid email').bail()
      .normalizeEmail({ gmail_remove_dots: false }),
    // bcrypt only uses the first 72 bytes, so cap there rather than silently ignoring the rest.
    requiredText('password').isLength({ min: 8, max: 72 }).withMessage('must be 8-72 characters'),
  ),
  auth.register,
);

router.post(
  '/login',
  validate(requiredText('username').trim(), requiredText('password')),
  auth.login,
);

router.post('/logout', auth.logout);
router.get('/me', requireAuth, auth.me);

export default router;
