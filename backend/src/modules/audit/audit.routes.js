const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { listAuditLogsController } = require('./audit.controller');

const router = express.Router();

// 只有管理员可以查看操作日志
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', listAuditLogsController);

module.exports = router;


