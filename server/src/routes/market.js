import { Router } from 'express';
import * as market from '../controllers/marketController.js';

const router = Router();

// Public: the login page can show whether the market is open.
router.get('/status', market.status);

export default router;
