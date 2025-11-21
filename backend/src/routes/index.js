import { Router } from 'express';

import authRouter from '../modules/auth/auth.routes.js';
import ordersRouter from '../modules/orders/orders.routes.js';
import customerOrdersRouter from '../modules/orders/orders.customer.routes.js';
import customerPetsRouter from '../modules/pets/pets.routes.js';
import customerAddressesRouter from '../modules/addresses/addresses.routes.js';
import customerProfileRouter from '../modules/profile/profile.routes.js';
import recipesRouter from '../modules/recipes/recipes.routes.js';
import breedsRouter from '../modules/breeds/breeds.routes.js';
import usersRouter from '../modules/users/users.routes.js';
import auditRouter from '../modules/audit/audit.routes.js';
import healthRouter from '../modules/health/health.routes.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/orders', ordersRouter);
router.use('/customer/orders', customerOrdersRouter);
router.use('/customer/pets', customerPetsRouter);
router.use('/customer/addresses', customerAddressesRouter);
router.use('/customer/profile', customerProfileRouter);
router.use('/recipes', recipesRouter);
router.use('/breeds', breedsRouter);
router.use('/users', usersRouter);
router.use('/audit', auditRouter);
router.use('/health', healthRouter);

export default router;


