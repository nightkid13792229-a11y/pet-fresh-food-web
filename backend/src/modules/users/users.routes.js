import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import {
  listUsersController,
  getUserController,
  createUserController,
  updateUserController,
  resetPasswordController,
  deleteUserController
} from './users.controller.js';

const router = Router();

// 所有用户管理路由都需要管理员权限
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', listUsersController);
router.get('/:id', getUserController);
router.post('/', createUserController);
router.put('/:id', updateUserController);
router.post('/:id/reset-password', resetPasswordController);
router.delete('/:id', deleteUserController);

export default router;


