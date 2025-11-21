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
    
    // 记录操作日志
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
    
    // 记录登录日志（注意：此时 req.user 可能还没有，需要从 result 获取）
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
    
    // 记录微信登录日志
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
