import { query } from '../../db/pool.js';

const createAuditLog = async (payload) => {
  const sql = `
    INSERT INTO audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      description,
      ip_address,
      user_agent,
      metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    payload.userId,
    payload.action,
    payload.resourceType || null,
    payload.resourceId || null,
    payload.description || null,
    payload.ipAddress || null,
    payload.userAgent || null,
    payload.metadata ? JSON.stringify(payload.metadata) : null
  ];
  const result = await query(sql, params);
  return result.insertId;
};

const findAuditLogs = async (options = {}) => {
  const { userId, action, resourceType, resourceId, page = 1, pageSize = 50 } = options;
  let sql = `
    SELECT
      al.id,
      al.user_id AS userId,
      u.name AS userName,
      u.email AS userEmail,
      al.action,
      al.resource_type AS resourceType,
      al.resource_id AS resourceId,
      al.description,
      al.ip_address AS ipAddress,
      al.user_agent AS userAgent,
      al.metadata,
      al.created_at AS createdAt
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (userId) {
    sql += ' AND al.user_id = ?';
    params.push(userId);
  }

  if (action) {
    sql += ' AND al.action = ?';
    params.push(action);
  }

  if (resourceType) {
    sql += ' AND al.resource_type = ?';
    params.push(resourceType);
  }

  if (resourceId) {
    sql += ' AND al.resource_id = ?';
    params.push(resourceId);
  }

  sql += ' ORDER BY al.created_at DESC';

  if (pageSize > 0) {
    const offset = (page - 1) * pageSize;
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;
  }

  const rows = await query(sql, params);
  return rows;
};

const countAuditLogs = async (options = {}) => {
  const { userId, action, resourceType, resourceId } = options;
  let sql = 'SELECT COUNT(*) AS total FROM audit_logs WHERE 1=1';
  const params = [];

  if (userId) {
    sql += ' AND user_id = ?';
    params.push(userId);
  }

  if (action) {
    sql += ' AND action = ?';
    params.push(action);
  }

  if (resourceType) {
    sql += ' AND resource_type = ?';
    params.push(resourceType);
  }

  if (resourceId) {
    sql += ' AND resource_id = ?';
    params.push(resourceId);
  }

  const rows = await query(sql, params);
  return rows[0].total;
};

export {
  createAuditLog,
  findAuditLogs,
  countAuditLogs
};


