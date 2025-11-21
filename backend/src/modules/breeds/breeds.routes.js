import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  listBreedsController,
  getBreedController,
  createBreedController,
  updateBreedController,
  deleteBreedController,
  listCategoriesController
} from './breeds.controller.js';
import { createBreedSchema, updateBreedSchema, listBreedsQuerySchema } from './breeds.schemas.js';

const router = Router();

// Public route: list breeds (for customer miniapp)
router.get('/', validate(listBreedsQuerySchema, 'query'), listBreedsController);

// Public route: list categories
router.get('/categories', listCategoriesController);

// Public route: get single breed
router.get('/:id', getBreedController);

// Admin/Employee routes: require authentication and authorization
router.use(authenticate, authorize('admin', 'employee'));

router.post('/', validate(createBreedSchema), createBreedController);
router.put('/:id', validate(updateBreedSchema), updateBreedController);
router.delete('/:id', deleteBreedController);

export default router;


