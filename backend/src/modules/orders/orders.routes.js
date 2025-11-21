import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import { createOrderSchema, listOrdersSchema, updateOrderSchema, updateOrderStatusSchema } from './orders.schemas.js';
import { createOrder, getOrder, listOrders, updateOrder, updateOrderStatus } from './orders.controller.js';

const router = Router();

router.get('/', authenticate, authorize('admin', 'employee'), validate(listOrdersSchema, 'query'), listOrders);
router.get('/:id', authenticate, authorize('admin', 'employee'), getOrder);
router.post('/', authenticate, authorize('admin'), validate(createOrderSchema), createOrder);
router.put('/:id', authenticate, authorize('admin'), validate(updateOrderSchema), updateOrder);
router.put(
  '/:id/status',
  authenticate,
  authorize('admin', 'employee'),
  validate(updateOrderStatusSchema),
  updateOrderStatus
);

export default router;

