import createError from 'http-errors';
import crypto from 'crypto';
import {
  createUser,
  createWeChatUser,
  findUserByEmail,
  findUserById,
  findUserByWeChatOpenId,
  findAllUsers,
  countUsers,
  updateUser,
  deleteUser
} from './users.repository.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { signToken } from '../../utils/token.js';
import { query } from '../db/pool.js';

// 检查用户资料是否完整（简化版，只检查是否有宠物）

const isProfileCompleted = async (userId) => {
  const rows = await query('SELECT COUNT(*) AS count FROM pet_profiles WHERE user_id = ?', [userId]);
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

export {
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
