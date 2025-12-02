import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  listRecipesController,
  getRecipeController,
  createRecipeController,
  updateRecipeController,
  deleteRecipeController
} from './recipes.controller.js';
import {
  createRecipeSchema,
  updateRecipeSchema,
  listRecipesQuerySchema
} from './recipes.schemas.js';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 列表查询（支持分页、搜索、筛选）
router.get('/', validate(listRecipesQuerySchema, 'query'), listRecipesController);

// 获取单个食谱
router.get('/:id', getRecipeController);

// 创建、更新、删除需要管理员或员工权限
router.use(authorize('admin', 'employee'));

router.post('/', validate(createRecipeSchema), createRecipeController);
router.put('/:id', validate(updateRecipeSchema), updateRecipeController);
router.delete('/:id', deleteRecipeController);

export default router;




