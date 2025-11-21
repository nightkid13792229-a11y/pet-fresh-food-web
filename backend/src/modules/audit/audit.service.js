import { createAuditLog, findAuditLogs, countAuditLogs } from './audit.repository.js';

export const logAction = async (payload) => {
  return createAuditLog(payload);
};

export const listAuditLogs = async (options = {}) => {
  const logs = await findAuditLogs(options);
  const total = await countAuditLogs(options);
  return {
    items: logs,
    total,
    page: options.page || 1,
    pageSize: options.pageSize || 50
  };
};


