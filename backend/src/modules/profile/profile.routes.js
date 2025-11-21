import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import { updateProfileSchema } from './profile.schemas.js';
import { getProfile, updateProfile } from './profile.controller.js';

const router = Router();

router.use(authenticate, authorize('customer'));

router.get('/', getProfile);
router.put('/', validate(updateProfileSchema), updateProfile);

export default router;


