const { success } = require('../../utils/response');
const { listAuditLogs } = require('./audit.service');

const listAuditLogsController = async (req, res) => {
  try {
    const options = {
      userId: req.query.userId ? parseInt(req.query.userId, 10) : undefined,
      action: req.query.action || undefined,
      resourceType: req.query.resourceType || undefined,
      resourceId: req.query.resourceId ? parseInt(req.query.resourceId, 10) : undefined,
      page: parseInt(req.query.page, 10) || 1,
      pageSize: parseInt(req.query.pageSize, 10) || 50
    };
    const result = await listAuditLogs(options);
    return success(res, result);
  } catch (error) {
    console.error('listAuditLogsController error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

module.exports = {
  listAuditLogsController
};


