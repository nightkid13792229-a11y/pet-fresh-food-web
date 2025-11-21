#!/bin/bash

# 这个脚本生成一个包含所有文件内容的部署脚本
# 使用方法：在服务器上执行生成的脚本

cat > /tmp/deploy_all.sh << 'DEPLOY_EOF'
#!/bin/bash

echo "开始部署..."

cd /srv/petfresh-api

# 创建目录
mkdir -p src/utils src/middleware src/modules/auth src/modules/users src/modules/audit

# 创建工具文件
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
      metadata: options.metadata || null
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

module.exports = {
  createAuditLog
};
EOF

# 创建中间件
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

echo "✓ 工具文件和中间件创建完成"

# 由于文件内容较长，我们使用 scp 方式
# 这里先创建占位文件，实际内容需要通过 scp 复制

echo ""
echo "=========================================="
echo "文件创建脚本已生成"
echo "由于文件内容较长，建议使用 scp 方式复制"
echo "=========================================="
DEPLOY_EOF

chmod +x /tmp/deploy_all.sh
echo "部署脚本已生成: /tmp/deploy_all.sh"


