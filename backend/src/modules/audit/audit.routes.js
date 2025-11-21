import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { listAuditLogsController } from './audit.controller.js';

const router = Router();

// 只有管理员可以查看操作日志
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', listAuditLogsController);

export default router;


