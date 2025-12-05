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
import { uploadRecipeCoverController } from './recipes.upload.controller.js';
import { upload } from '../../utils/upload.js';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 列表查询（支持分页、搜索、筛选）
router.get('/', validate(listRecipesQuerySchema, 'query'), listRecipesController);

// 创建、更新、删除需要管理员或员工权限
router.use(authorize('admin', 'employee'));

// 上传食谱封面照片（必须在 /:id 路由之前，避免被参数路由匹配）
router.post('/upload-cover', 
  (req, res, next) => {
    console.log('[recipes.routes] upload-cover 路由被调用');
    console.log('[recipes.routes] 请求方法:', req.method);
    console.log('[recipes.routes] 请求路径:', req.path);
    console.log('[recipes.routes] 请求URL:', req.url);
    console.log('[recipes.routes] 请求头Content-Type:', req.headers['content-type']);
    next();
  },
  upload.single('file'),
  (req, res, next) => {
    console.log('[recipes.routes] 文件上传中间件执行后，是否有文件:', !!req.file);
    if (req.file) {
      console.log('[recipes.routes] 文件信息:', req.file.filename, req.file.size);
    }
    next();
  },
  uploadRecipeCoverController
);

// 获取单个食谱（必须在 /upload-cover 之后）
router.get('/:id', getRecipeController);

router.post('/', validate(createRecipeSchema), createRecipeController);
router.put('/:id', validate(updateRecipeSchema), updateRecipeController);
router.delete('/:id', deleteRecipeController);

export default router;




