import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  listItemsController,
  getItemController,
  createItemController,
  updateItemController,
  deleteItemController,
  importPresetItemsController,
  getItemUsageController
} from './ingredient-items.controller.js';
import {
  createItemSchema,
  updateItemSchema,
  listItemsQuerySchema,
  importPresetItemsSchema
} from './ingredient-items.schemas.js';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 列表查询（支持搜索、筛选）
router.get('/', validate(listItemsQuerySchema, 'query'), listItemsController);

// 获取项目使用统计
router.get('/usage', getItemUsageController);

// 获取单个项目
router.get('/:id', getItemController);

// 创建、更新、删除需要管理员或员工权限
router.use(authorize('admin', 'employee'));

router.post('/', validate(createItemSchema), createItemController);
router.post('/import-preset', validate(importPresetItemsSchema), importPresetItemsController);
router.put('/:id', validate(updateItemSchema), updateItemController);
router.delete('/:id', deleteItemController);

export default router;




