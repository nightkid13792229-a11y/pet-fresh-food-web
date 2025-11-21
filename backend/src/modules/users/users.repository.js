const pool = require('../../../db/pool');

const createUser = async ({ email, passwordHash, name, role }) => {
  const sql = `
    INSERT INTO users (email, password_hash, name, role)
    VALUES (?, ?, ?, ?)
  `;
  const [result] = await pool.query(sql, [email, passwordHash, name, role]);
  return { id: result.insertId, email, name, role };
};

const findUserByEmail = async (email) => {
  const sql = `
    SELECT id, email, password_hash AS passwordHash, name, role, status, wechat_openid AS wechatOpenId
    FROM users
    WHERE email = ?
    LIMIT 1
  `;
  const [rows] = await pool.query(sql, [email]);
  return rows[0] || null;
};

const findUserById = async (id) => {
  const sql = `
    SELECT id, email, name, role, status, wechat_openid AS wechatOpenId, wechat_unionid AS wechatUnionId, contact_info AS contactInfo
    FROM users
    WHERE id = ?
    LIMIT 1
  `;
  const [rows] = await pool.query(sql, [id]);
  return rows[0] || null;
};

const findUserByWeChatOpenId = async (openId) => {
  const sql = `
    SELECT
      id,
      email,
      password_hash AS passwordHash,
      name,
      role,
      status,
      wechat_openid AS wechatOpenId,
      wechat_unionid AS wechatUnionId
    FROM users
    WHERE wechat_openid = ?
    LIMIT 1
  `;
  const [rows] = await pool.query(sql, [openId]);
  return rows[0] || null;
};

const createWeChatUser = async ({ email, passwordHash, name, openId, unionId }) => {
  const sql = `
    INSERT INTO users (email, password_hash, name, role, wechat_openid, wechat_unionid)
    VALUES (?, ?, ?, 'customer', ?, ?)
  `;
  const [result] = await pool.query(sql, [email, passwordHash, name, openId, unionId || null]);
  return {
    id: result.insertId,
    email,
    name,
    role: 'customer',
    wechatOpenId: openId,
    wechatUnionId: unionId || null,
    status: 'active'
  };
};

const findAllUsers = async (options = {}) => {
  const { role, status, search, page = 1, pageSize = 50 } = options;
  let sql = `
    SELECT
      id,
      email,
      name,
      role,
      status,
      wechat_openid AS wechatOpenId,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM users
    WHERE 1=1
  `;
  const params = [];

  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    sql += ' AND (email LIKE ? OR name LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern);
  }

  sql += ' ORDER BY created_at DESC';

  if (pageSize > 0) {
    const offset = (page - 1) * pageSize;
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;
  }

  const [rows] = await pool.query(sql, params);
  return rows;
};

const countUsers = async (options = {}) => {
  const { role, status, search } = options;
  let sql = 'SELECT COUNT(*) AS total FROM users WHERE 1=1';
  const params = [];

  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    sql += ' AND (email LIKE ? OR name LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern);
  }

  const [rows] = await pool.query(sql, params);
  return rows[0].total;
};

const updateUser = async (id, payload) => {
  const fields = [];
  const params = [];

  if (payload.name !== undefined) {
    fields.push('name = ?');
    params.push(payload.name);
  }

  if (payload.role !== undefined) {
    fields.push('role = ?');
    params.push(payload.role);
  }

  if (payload.status !== undefined) {
    fields.push('status = ?');
    params.push(payload.status);
  }

  if (payload.passwordHash !== undefined) {
    fields.push('password_hash = ?');
    params.push(payload.passwordHash);
  }

  if (fields.length === 0) {
    return findUserById(id);
  }

  fields.push('updated_at = NOW()');
  params.push(id);

  const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
  await pool.query(sql, params);
  return findUserById(id);
};

const deleteUser = async (id) => {
  const sql = 'DELETE FROM users WHERE id = ?';
  const [result] = await pool.query(sql, [id]);
  return result.affectedRows > 0;
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByWeChatOpenId,
  createWeChatUser,
  findAllUsers,
  countUsers,
  updateUser,
  deleteUser
};
