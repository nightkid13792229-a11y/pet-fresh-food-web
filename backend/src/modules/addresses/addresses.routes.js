import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import { createAddressSchema, updateAddressSchema } from './addresses.schemas.js';
import {
  createAddressHandler,
  deleteAddressHandler,
  getAddressHandler,
  listAddresses,
  updateAddressHandler,
  // 管理员专用
  listAddressesByCustomerId,
  createAddressForCustomer,
  updateAddressForCustomer,
  deleteAddressForCustomer,
  getAddressForCustomer
} from './addresses.controller.js';

const router = Router();

// 客户路由（customer角色）
router.use(authenticate, authorize('customer'));

router.get('/', listAddresses);
router.get('/:id', getAddressHandler);
router.post('/', validate(createAddressSchema), createAddressHandler);
router.put('/:id', validate(updateAddressSchema), updateAddressHandler);
router.delete('/:id', deleteAddressHandler);

export default router;

// 管理员路由（admin和employee角色）
export const adminAddressRouter = Router();

adminAddressRouter.use(authenticate, authorize('admin', 'employee'));

// 获取指定用户的所有地址
adminAddressRouter.get('/customer/:customerId', listAddressesByCustomerId);
// 获取指定地址详情
adminAddressRouter.get('/:id', getAddressForCustomer);
// 为用户创建地址
adminAddressRouter.post('/customer/:customerId', validate(createAddressSchema), createAddressForCustomer);
// 更新用户地址
adminAddressRouter.put('/:id', validate(updateAddressSchema), updateAddressForCustomer);
// 删除用户地址
adminAddressRouter.delete('/:id', deleteAddressForCustomer);




