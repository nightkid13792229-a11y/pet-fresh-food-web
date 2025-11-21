#!/bin/bash

# 完整部署脚本 - 在服务器上执行
# 使用方法：将脚本复制到服务器后执行: bash deploy_all_on_server.sh

set -e  # 遇到错误立即退出

echo "=========================================="
echo "开始部署 Auth 和用户管理模块"
echo "=========================================="

cd /srv/petfresh-api

# 步骤 1: 创建操作日志表
echo ""
echo "步骤 1: 创建操作日志表..."
if [ -f /root/create_audit_logs_table.sql ]; then
    mysql -u root -p petfresh < /root/create_audit_logs_table.sql
    echo "✓ 操作日志表创建成功"
else
    echo "✗ 错误: /root/create_audit_logs_table.sql 不存在"
    echo "请先执行: scp backend/sql/create_audit_logs_table.sql root@8.137.166.134:/root/"
    exit 1
fi

# 步骤 2: 安装 npm 依赖
echo ""
echo "步骤 2: 安装 npm 依赖..."
npm install bcryptjs jsonwebtoken
echo "✓ npm 依赖安装完成"

# 步骤 3: 创建目录结构
echo ""
echo "步骤 3: 创建目录结构..."
mkdir -p src/utils src/middleware src/modules/auth src/modules/users src/modules/audit
echo "✓ 目录结构创建完成"

# 步骤 4: 创建工具文件
echo ""
echo "步骤 4: 创建工具文件..."

cat > src/utils/password.js << 'EOF'
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

const hashPassword = async (plain) => {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
};

const comparePassword = async (plain, hashed) => {
  return bcrypt.compare(plain, hashed);
};

module.exports = {
  hashPassword,
  comparePassword
};
EOF

cat > src/utils/token.js << 'EOF'
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const signToken = (payload, options = {}) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    ...options
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  signToken,
  verifyToken
};
EOF

cat > src/utils/response.js << 'EOF'
const success = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data: data
  });
};

module.exports = { success };
EOF

cat > src/utils/audit-helper.js << 'EOF'
const { logAction } = require('../modules/audit/audit.service');

const createAuditLog = async (req, action, options = {}) => {
  try {
    const userId = req.user ? req.user.id : null;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || null;

    await logAction({
      userId,
      action,
      resourceType: options.resourceType || null,
      resourceId: options.resourceId || null,
      description: options.description || null,
      ipAddress,
      userAgent,
      metadata: options.metadata ? JSON.stringify(options.metadata) : null
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

module.exports = {
  createAuditLog
};
EOF

echo "✓ 工具文件创建完成"

# 步骤 5: 创建中间件
echo ""
echo "步骤 5: 创建中间件..."

cat > src/middleware/auth.js << 'EOF'
const createError = require('http-errors');
const { verifyToken } = require('../utils/token');
const { getProfile } = require('../modules/users/users.service');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError(401, 'Authentication token missing'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    const user = await getProfile(payload.id);
    if (user.status === 'disabled') {
      return next(createError(403, 'Account disabled'));
    }
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
    return next();
  } catch (error) {
    return next(createError(401, 'Invalid or expired token'));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || (roles.length > 0 && !roles.includes(req.user.role))) {
      return next(createError(403, 'Insufficient permissions'));
    }
    return next();
  };
};

module.exports = {
  authenticate,
  authorize
};
EOF

cat > src/middleware/validate.js << 'EOF'
module.exports = (schema, source = 'body') => {
  return (req, res, next) => {
    next();
  };
};
EOF

echo "✓ 中间件创建完成"

# 步骤 6: 创建 Auth 模块
echo ""
echo "步骤 6: 创建 Auth 模块..."

cat > src/modules/auth/auth.schemas.js << 'EOF'
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateRegister = (data) => {
  const errors = [];
  
  if (!data.email || !validateEmail(data.email)) {
    errors.push('邮箱格式不正确');
  }
  
  if (!data.password || data.password.length < 8) {
    errors.push('密码至少需要8个字符');
  }
  
  if (!data.name || data.name.length < 2 || data.name.length > 100) {
    errors.push('姓名长度应在2-100个字符之间');
  }
  
  if (data.role && !['admin', 'employee', 'customer'].includes(data.role)) {
    errors.push('角色必须是 admin, employee 或 customer');
  }
  
  return errors;
};

const validateLogin = (data) => {
  const errors = [];
  
  if (!data.email || !validateEmail(data.email)) {
    errors.push('邮箱格式不正确');
  }
  
  if (!data.password || data.password.length < 8) {
    errors.push('密码至少需要8个字符');
  }
  
  return errors;
};

const validateWeChatLogin = (data) => {
  const errors = [];
  
  if (!data.code || data.code.trim().length === 0) {
    errors.push('微信登录码不能为空');
  }
  
  return errors;
};

module.exports = {
  validateRegister,
  validateLogin,
  validateWeChatLogin
};
EOF

cat > src/modules/auth/auth.controller.js << 'EOF'
const { success } = require('../../utils/response');
const { registerUser, loginUser, getProfile, wechatLogin } = require('../users/users.service');
const { createAuditLog } = require('../../utils/audit-helper');
const { validateRegister, validateLogin, validateWeChatLogin } = require('./auth.schemas');

const register = async (req, res) => {
  try {
    const errors = validateRegister(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }

    const { user, token } = await registerUser(req.body);
    
    await createAuditLog(req, 'create_user', {
      resourceType: 'user',
      resourceId: user.id,
      description: `创建用户: ${user.email} (${user.role})`
    });

    return success(res, { user, token }, 201);
  } catch (error) {
    console.error('Register error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const errors = validateLogin(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }

    const result = await loginUser(req.body);
    
    const loginReq = { ...req, user: { id: result.user.id } };
    await createAuditLog(loginReq, 'login', {
      description: `用户登录: ${result.user.email}`
    });

    return success(res, result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

const profile = async (req, res) => {
  try {
    const user = await getProfile(req.user.id);
    return success(res, user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

const loginWithWeChat = async (req, res) => {
  try {
    const errors = validateWeChatLogin(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }

    const result = await wechatLogin(req.body);
    
    const loginReq = { ...req, user: { id: result.user.id } };
    await createAuditLog(loginReq, 'wechat_login', {
      description: `微信登录: ${result.user.email || result.user.wechatOpenId}`
    });

    return success(res, result);
  } catch (error) {
    console.error('WeChat login error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  profile,
  loginWithWeChat
};
EOF

cat > src/modules/auth/auth.routes.js << 'EOF'
const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { register, login, loginWithWeChat, profile } = require('./auth.controller');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/wechat-login', loginWithWeChat);
router.get('/me', authenticate, profile);

module.exports = router;
EOF

echo "✓ Auth 模块创建完成"

# 步骤 7: 创建 Users 模块
echo ""
echo "步骤 7: 创建 Users 模块..."

# 由于 users.repository.js 和 users.service.js 文件较长，我需要分段创建
# 先创建 users.repository.js
cat > src/modules/users/users.repository.js << 'REPO_EOF'
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
REPO_EOF

# 创建 users.service.js (文件较长，需要小心处理)
cat > src/modules/users/users.service.js << 'SERVICE_EOF'
const createError = require('http-errors');
const crypto = require('crypto');
const {
  createUser,
  createWeChatUser,
  findUserByEmail,
  findUserById,
  findUserByWeChatOpenId,
  findAllUsers,
  countUsers,
  updateUser,
  deleteUser
} = require('./users.repository');
const { hashPassword, comparePassword } = require('../../utils/password');
const { signToken } = require('../../utils/token');

const isProfileCompleted = async (userId) => {
  const pool = require('../../../db/pool');
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM pet_profiles WHERE user_id = ?', [userId]);
  return rows[0].count > 0;
};

const registerUser = async ({ email, password, name, role }) => {
  const existing = await findUserByEmail(email);
  if (existing) {
    throw createError(409, 'Email already registered');
  }
  const passwordHash = await hashPassword(password);
  const user = await createUser({ email, passwordHash, name, role });
  const token = signToken({ id: user.id, role: user.role, email: user.email });
  const profileCompleted = role !== 'customer' ? true : await isProfileCompleted(user.id);
  return {
    user: { ...user, profileCompleted },
    token
  };
};

const loginUser = async ({ email, password }) => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw createError(401, 'Invalid credentials');
  }
  const match = await comparePassword(password, user.passwordHash);
  if (!match) {
    throw createError(401, 'Invalid credentials');
  }

  if (user.status === 'disabled') {
    throw createError(403, 'Account disabled');
  }

  const token = signToken({ id: user.id, role: user.role, email: user.email });
  const profileCompleted = user.role !== 'customer' ? true : await isProfileCompleted(user.id);
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profileCompleted
    },
    token
  };
};

const getProfile = async (id) => {
  const user = await findUserById(id);
  if (!user) {
    throw createError(404, 'User not found');
  }
  const profileCompleted = user.role !== 'customer' ? true : await isProfileCompleted(id);
  return {
    ...user,
    profileCompleted
  };
};

const wechatLogin = async ({ code }) => {
  if (!code) {
    throw createError(400, 'Missing login code');
  }

  const WX_APP_ID = process.env.WX_APP_ID;
  const WX_APP_SECRET = process.env.WX_APP_SECRET;

  if (!WX_APP_ID || !WX_APP_SECRET) {
    throw createError(500, 'WeChat login is not configured');
  }

  const params = new URLSearchParams({
    appid: WX_APP_ID,
    secret: WX_APP_SECRET,
    js_code: code,
    grant_type: 'authorization_code'
  });

  let payload;
  try {
    const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${params.toString()}`);
    if (!response.ok) {
      throw createError(response.status, 'Failed to communicate with WeChat service');
    }
    payload = await response.json();
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) {
      throw error;
    }
    throw createError(502, error.message || 'WeChat service unavailable');
  }

  if (payload.errcode) {
    const message = payload.errmsg || 'WeChat login failed';
    throw createError(400, `WeChat error ${payload.errcode}: ${message}`);
  }

  const openId = payload.openid;
  const unionId = payload.unionid;
  if (!openId) {
    throw createError(400, 'Invalid WeChat response');
  }

  let user = await findUserByWeChatOpenId(openId);
  if (!user) {
    const pseudoEmail = `${openId}@wechat.petfresh`;
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const passwordHash = await hashPassword(randomPassword);
    const displayName = '微信用户';
    user = await createWeChatUser({
      email: pseudoEmail,
      passwordHash,
      name: displayName,
      openId,
      unionId
    });
  }

  if (user.status === 'disabled') {
    throw createError(403, 'Account disabled');
  }

  const token = signToken({
    id: user.id,
    role: user.role,
    email: user.email,
    openId: user.wechatOpenId
  });

  const profileCompleted = user.role !== 'customer' ? true : await isProfileCompleted(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      wechatOpenId: user.wechatOpenId,
      profileCompleted
    },
    token
  };
};

const listUsers = async (options = {}) => {
  const users = await findAllUsers(options);
  const total = await countUsers(options);
  return {
    items: users,
    total,
    page: options.page || 1,
    pageSize: options.pageSize || 50
  };
};

const getUser = async (id) => {
  const user = await findUserById(id);
  if (!user) {
    throw createError(404, 'User not found');
  }
  return user;
};

const createUserRecord = async (payload) => {
  const existing = await findUserByEmail(payload.email);
  if (existing) {
    throw createError(409, 'Email already registered');
  }
  const passwordHash = await hashPassword(payload.password);
  return createUser({
    email: payload.email,
    passwordHash,
    name: payload.name,
    role: payload.role || 'employee'
  });
};

const updateUserRecord = async (id, payload) => {
  const user = await findUserById(id);
  if (!user) {
    throw createError(404, 'User not found');
  }

  const updateData = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.role !== undefined) updateData.role = payload.role;
  if (payload.status !== undefined) updateData.status = payload.status;

  return updateUser(id, updateData);
};

const resetUserPassword = async (id, newPassword) => {
  const user = await findUserById(id);
  if (!user) {
    throw createError(404, 'User not found');
  }
  const passwordHash = await hashPassword(newPassword);
  return updateUser(id, { passwordHash });
};

const removeUser = async (id) => {
  const user = await findUserById(id);
  if (!user) {
    throw createError(404, 'User not found');
  }
  const deleted = await deleteUser(id);
  if (!deleted) {
    throw createError(500, 'Failed to delete user');
  }
  return true;
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  wechatLogin,
  listUsers,
  getUser,
  createUserRecord,
  updateUserRecord,
  resetUserPassword,
  removeUser,
  isProfileCompleted
};
SERVICE_EOF

cat > src/modules/users/users.controller.js << 'CONTROLLER_EOF'
const { success } = require('../../utils/response');
const {
  listUsers,
  getUser,
  createUserRecord,
  updateUserRecord,
  resetUserPassword,
  removeUser
} = require('./users.service');
const { createAuditLog } = require('../../utils/audit-helper');

const listUsersController = async (req, res) => {
  try {
    const options = {
      role: req.query.role || undefined,
      status: req.query.status || undefined,
      search: req.query.search || undefined,
      page: parseInt(req.query.page, 10) || 1,
      pageSize: parseInt(req.query.pageSize, 10) || 50
    };
    const result = await listUsers(options);
    return success(res, result);
  } catch (error) {
    console.error('listUsersController error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

const getUserController = async (req, res) => {
  try {
    const user = await getUser(req.params.id);
    return success(res, user);
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

const createUserController = async (req, res) => {
  try {
    const user = await createUserRecord(req.body);
    
    await createAuditLog(req, 'create_user', {
      resourceType: 'user',
      resourceId: user.id,
      description: `创建用户: ${user.email} (${user.role})`
    });

    return success(res, user, 201);
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

const updateUserController = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const user = await updateUserRecord(userId, req.body);
    
    const action = req.body.status === 'disabled' ? 'disable_user' : 
                   req.body.status === 'active' ? 'enable_user' : 'update_user';
    await createAuditLog(req, action, {
      resourceType: 'user',
      resourceId: userId,
      description: `${action === 'disable_user' ? '禁用' : action === 'enable_user' ? '启用' : '更新'}用户: ${user.email}`
    });

    return success(res, user);
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

const resetPasswordController = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: '新密码至少需要8个字符' });
    }

    await resetUserPassword(userId, newPassword);
    
    const targetUser = await getUser(userId);
    await createAuditLog(req, 'reset_password', {
      resourceType: 'user',
      resourceId: userId,
      description: `重置用户密码: ${targetUser.email}`
    });

    return success(res, { message: '密码重置成功' });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

const deleteUserController = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const targetUser = await getUser(userId);
    
    await removeUser(userId);
    
    await createAuditLog(req, 'delete_user', {
      resourceType: 'user',
      resourceId: userId,
      description: `删除用户: ${targetUser.email}`
    });

    return success(res, { message: '用户删除成功' });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

module.exports = {
  listUsersController,
  getUserController,
  createUserController,
  updateUserController,
  resetPasswordController,
  deleteUserController
};
CONTROLLER_EOF

cat > src/modules/users/users.routes.js << 'ROUTES_EOF'
const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const {
  listUsersController,
  getUserController,
  createUserController,
  updateUserController,
  resetPasswordController,
  deleteUserController
} = require('./users.controller');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', listUsersController);
router.get('/:id', getUserController);
router.post('/', createUserController);
router.put('/:id', updateUserController);
router.post('/:id/reset-password', resetPasswordController);
router.delete('/:id', deleteUserController);

module.exports = router;
ROUTES_EOF

echo "✓ Users 模块创建完成"

# 步骤 8: 创建 Audit 模块
echo ""
echo "步骤 8: 创建 Audit 模块..."

cat > src/modules/audit/audit.repository.js << 'AUDIT_REPO_EOF'
const pool = require('../../../db/pool');

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
  const [result] = await pool.query(sql, params);
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

  const [rows] = await pool.query(sql, params);
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

  const [rows] = await pool.query(sql, params);
  return rows[0].total;
};

module.exports = {
  createAuditLog,
  findAuditLogs,
  countAuditLogs
};
AUDIT_REPO_EOF

cat > src/modules/audit/audit.service.js << 'AUDIT_SERVICE_EOF'
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
AUDIT_SERVICE_EOF

cat > src/modules/audit/audit.controller.js << 'AUDIT_CONTROLLER_EOF'
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
AUDIT_CONTROLLER_EOF

cat > src/modules/audit/audit.routes.js << 'AUDIT_ROUTES_EOF'
const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { listAuditLogsController } = require('./audit.controller');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', listAuditLogsController);

module.exports = router;
AUDIT_ROUTES_EOF

echo "✓ Audit 模块创建完成"

# 步骤 9: 修改 index.js
echo ""
echo "步骤 9: 修改 index.js..."
echo "⚠️  需要手动修改 index.js，添加路由注册"
echo ""
echo "请在 index.js 中找到这一行："
echo "  app.use('/api/v1/breeds', breedsRouter);"
echo ""
echo "在这行之后添加："
echo "  const authRouter = require('./src/modules/auth/auth.routes');"
echo "  const usersRouter = require('./src/modules/users/users.routes');"
echo "  const auditRouter = require('./src/modules/audit/audit.routes');"
echo ""
echo "  app.use('/api/v1/auth', authRouter);"
echo "  app.use('/api/v1/users', usersRouter);"
echo "  app.use('/api/v1/audit', auditRouter);"
echo ""

# 自动修改 index.js（如果 breedsRouter 存在）
if grep -q "app.use('/api/v1/breeds'" index.js; then
    echo "检测到 breedsRouter，尝试自动添加路由..."
    
    # 备份
    cp index.js index.js.backup.$(date +%Y%m%d_%H%M%S)
    
    # 查找 breedsRouter 的行号
    BREED_LINE=$(grep -n "app.use('/api/v1/breeds'" index.js | cut -d: -f1)
    
    if [ -n "$BREED_LINE" ]; then
        # 在 breedsRouter 之后插入新路由
        sed -i "${BREED_LINE}a\\
// Auth 和用户管理路由\\
const authRouter = require('./src/modules/auth/auth.routes');\\
const usersRouter = require('./src/modules/users/users.routes');\\
const auditRouter = require('./src/modules/audit/audit.routes');\\
\\
app.use('/api/v1/auth', authRouter);\\
app.use('/api/v1/users', usersRouter);\\
app.use('/api/v1/audit', auditRouter);
" index.js
        
        echo "✓ index.js 已自动修改"
        
        # 验证语法
        if node -c index.js 2>/dev/null; then
            echo "✓ index.js 语法检查通过"
        else
            echo "✗ index.js 语法检查失败，请手动检查"
            echo "已创建备份文件，可以恢复: cp index.js.backup.* index.js"
        fi
    else
        echo "⚠️  未找到 breedsRouter，请手动修改 index.js"
    fi
else
    echo "⚠️  未找到 breedsRouter，请手动修改 index.js"
fi

echo ""
echo "=========================================="
echo "部署完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 如果 index.js 已自动修改，执行: pm2 restart petfresh-api"
echo "2. 如果 index.js 需要手动修改，请编辑后执行: pm2 restart petfresh-api"
echo "3. 测试登录接口:"
echo "   curl -X POST http://127.0.0.1:3000/api/v1/auth/login \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"email\":\"admin@example.com\",\"password\":\"admin123\"}'"
echo ""


