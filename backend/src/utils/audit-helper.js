import { logAction } from '../modules/audit/audit.service.js';

// 记录操作日志的辅助函数
export const createAuditLog = async (req, action, options = {}) => {
  try {
    const userId = req.user ? req.user.id : null;
    const ipAddress = req.ip || 
      (req.headers && req.headers['x-forwarded-for']) || 
      (req.connection && req.connection.remoteAddress) || 
      null;
    const userAgent = (req.headers && req.headers['user-agent']) || null;

    await logAction({
      userId,
      action,
      resourceType: options.resourceType || null,
      resourceId: options.resourceId || null,
      description: options.description || null,
      ipAddress,
      userAgent,
      metadata: options.metadata || null
    });
  } catch (error) {
    // 日志记录失败不应该影响主流程
    console.error('Failed to create audit log:', error);
  }
};


