const { createAuditLog, findAuditLogs, countAuditLogs } = require('./audit.repository');

const logAction = async (payload) => {
  return createAuditLog(payload);
};

const listAuditLogs = async (options = {}) => {
  const logs = await findAuditLogs(options);
  const total = await countAuditLogs(options);
  return {
    items: logs,
    total,
    page: options.page || 1,
    pageSize: options.pageSize || 50
  };
};

module.exports = {
  logAction,
  listAuditLogs
};


