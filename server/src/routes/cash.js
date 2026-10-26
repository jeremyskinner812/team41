import { Router } from 'express';
import * as cash from '../controllers/cashController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { moneyBody, validate } from '../middleware/validate.js';
import { MAX_CASH_TRANSFER_CENTS } from '../services/cashService.js';

const router = Router();

router.use(requireAuth, requireRole('customer'));

router.get('/', cash.balance);
router.post('/deposit', validate(moneyBody('amount', { maxCents: MAX_CASH_TRANSFER_CENTS })), cash.deposit);
router.post('/withdraw', validate(moneyBody('amount', { maxCents: MAX_CASH_TRANSFER_CENTS })), cash.withdraw);

export default router;
