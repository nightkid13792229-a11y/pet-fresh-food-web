import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  createCustomerOrderSchema,
  listCustomerOrdersSchema
} from './orders.schemas.js';
import {
  createCustomerOrder,
  getCustomerOrder,
  listCustomerOrders
} from './orders.controller.js';

const router = Router();

router.use(authenticate, authorize('customer'));

router.get('/', validate(listCustomerOrdersSchema, 'query'), listCustomerOrders);
router.get('/:id', getCustomerOrder);
router.post('/', validate(createCustomerOrderSchema), createCustomerOrder);

export default router;


