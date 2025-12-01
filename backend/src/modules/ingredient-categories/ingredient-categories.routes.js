import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  listCategoriesController,
  getCategoryController,
  createCategoryController,
  updateCategoryController,
  deleteCategoryController,
  importPresetCategoriesController,
  getCategoryUsageController
} from './ingredient-categories.controller.js';
import {
  createCategorySchema,
  updateCategorySchema,
  listCategoriesQuerySchema,
  importPresetCategoriesSchema
} from './ingredient-categories.schemas.js';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 列表查询（支持搜索、筛选）
router.get('/', validate(listCategoriesQuerySchema, 'query'), listCategoriesController);

// 获取分类使用统计
router.get('/usage', getCategoryUsageController);

// 获取单个分类
router.get('/:id', getCategoryController);

// 创建、更新、删除需要管理员或员工权限
router.use(authorize('admin', 'employee'));

router.post('/', validate(createCategorySchema), createCategoryController);
router.post('/import-preset', validate(importPresetCategoriesSchema), importPresetCategoriesController);
router.put('/:id', validate(updateCategorySchema), updateCategoryController);
router.delete('/:id', deleteCategoryController);

export default router;




