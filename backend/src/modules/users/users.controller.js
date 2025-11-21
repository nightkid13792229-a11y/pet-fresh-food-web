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
    
    // 记录操作日志
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
    
    // 记录操作日志
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
    
    // 记录操作日志
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
    
    // 记录操作日志
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


