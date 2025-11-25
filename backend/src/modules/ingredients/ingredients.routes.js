import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  listIngredientsController,
  getIngredientController,
  createIngredientController,
  updateIngredientController,
  deleteIngredientController
} from './ingredients.controller.js';
import {
  createIngredientSchema,
  updateIngredientSchema,
  listIngredientsQuerySchema
} from './ingredients.schemas.js';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 列表查询（支持分页、搜索、筛选）
router.get('/', validate(listIngredientsQuerySchema, 'query'), listIngredientsController);

// 获取单个原料
router.get('/:id', getIngredientController);

// 创建、更新、删除需要管理员或员工权限
router.use(authorize('admin', 'employee'));

router.post('/', validate(createIngredientSchema), createIngredientController);
router.put('/:id', validate(updateIngredientSchema), updateIngredientController);
router.delete('/:id', deleteIngredientController);

export default router;


