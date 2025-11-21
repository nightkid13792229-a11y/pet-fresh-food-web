import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import { createAddressSchema, updateAddressSchema } from './addresses.schemas.js';
import {
  createAddressHandler,
  deleteAddressHandler,
  getAddressHandler,
  listAddresses,
  updateAddressHandler
} from './addresses.controller.js';

const router = Router();

router.use(authenticate, authorize('customer'));

router.get('/', listAddresses);
router.get('/:id', getAddressHandler);
router.post('/', validate(createAddressSchema), createAddressHandler);
router.put('/:id', validate(updateAddressSchema), updateAddressHandler);
router.delete('/:id', deleteAddressHandler);

export default router;



