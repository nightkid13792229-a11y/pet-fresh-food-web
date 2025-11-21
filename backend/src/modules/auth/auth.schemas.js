// 简化的验证函数（不使用 Joi，直接验证）
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

export {
  validateRegister,
  validateLogin,
  validateWeChatLogin
};
