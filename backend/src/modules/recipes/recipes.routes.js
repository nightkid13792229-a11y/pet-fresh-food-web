import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { getRecipe, listRecipes } from './recipes.controller.js';

const router = Router();

router.get('/', authenticate, listRecipes);
router.get('/:id', authenticate, getRecipe);

export default router;



