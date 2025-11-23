import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  createCustomerPet,
  deleteCustomerPet,
  listCustomerPets,
  updateCustomerPet,
  listAllPetsController
} from './pets.controller.js';
import { createPetSchema, updatePetSchema } from './pets.schemas.js';

const router = Router();

router.use(authenticate, authorize('customer'));

router.get('/', listCustomerPets);
router.post('/', validate(createPetSchema), createCustomerPet);
router.put('/:id', validate(updatePetSchema), updateCustomerPet);
router.delete('/:id', deleteCustomerPet);

export default router;

// 管理员端路由（单独导出）
export const adminPetsRouter = Router();
adminPetsRouter.use(authenticate, authorize('admin', 'employee'));
adminPetsRouter.get('/', listAllPetsController);


