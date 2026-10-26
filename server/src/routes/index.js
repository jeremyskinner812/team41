import { Router } from 'express';
import authRoutes from './auth.js';
import marketRoutes from './market.js';
import stockRoutes from './stocks.js';
import orderRoutes from './orders.js';
import portfolioRoutes from './portfolio.js';
import cashRoutes from './cash.js';
import adminRoutes from './admin.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/market', marketRoutes);
router.use('/stocks', stockRoutes);
router.use('/orders', orderRoutes);
router.use(portfolioRoutes);
router.use('/cash', cashRoutes);
router.use('/admin', adminRoutes);

export default router;
