const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const {
  listUsersController,
  getUserController,
  createUserController,
  updateUserController,
  resetPasswordController,
  deleteUserController
} = require('./users.controller');

const router = express.Router();

// 所有用户管理路由都需要管理员权限
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', listUsersController);
router.get('/:id', getUserController);
router.post('/', createUserController);
router.put('/:id', updateUserController);
router.post('/:id/reset-password', resetPasswordController);
router.delete('/:id', deleteUserController);

module.exports = router;


