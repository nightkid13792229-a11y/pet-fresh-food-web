#!/bin/bash

# 部署脚本 - 在服务器上执行
# 使用方法：在服务器上执行 bash deploy_server.sh

echo "开始部署 Auth 和用户管理模块..."

# 步骤 1: 创建操作日志表
echo "步骤 1: 创建操作日志表..."
mysql -u root -p petfresh < /root/create_audit_logs_table.sql
if [ $? -eq 0 ]; then
    echo "✓ 操作日志表创建成功"
else
    echo "✗ 操作日志表创建失败"
    exit 1
fi

# 步骤 2: 安装 npm 依赖
echo "步骤 2: 安装 npm 依赖..."
cd /srv/petfresh-api
npm install bcryptjs jsonwebtoken
if [ $? -eq 0 ]; then
    echo "✓ npm 依赖安装成功"
else
    echo "✗ npm 依赖安装失败"
    exit 1
fi

# 步骤 3: 创建目录结构
echo "步骤 3: 创建目录结构..."
mkdir -p src/utils src/middleware src/modules/auth src/modules/users src/modules/audit
echo "✓ 目录结构创建完成"

# 步骤 4: 备份 index.js
echo "步骤 4: 备份 index.js..."
cp index.js index.js.backup.$(date +%Y%m%d_%H%M%S)
echo "✓ index.js 已备份"

# 步骤 5: 检查文件是否存在
echo "步骤 5: 检查文件..."
if [ ! -f "src/utils/password.js" ]; then
    echo "✗ 错误: src/utils/password.js 不存在，请先复制文件"
    exit 1
fi

if [ ! -f "src/modules/auth/auth.routes.js" ]; then
    echo "✗ 错误: src/modules/auth/auth.routes.js 不存在，请先复制文件"
    exit 1
fi

echo "✓ 所有文件检查通过"

# 步骤 6: 修改 index.js（需要手动编辑）
echo ""
echo "=========================================="
echo "步骤 6: 需要手动修改 index.js"
echo "=========================================="
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
echo "修改完成后，执行："
echo "  node -c index.js  # 检查语法"
echo "  pm2 restart petfresh-api  # 重启服务"
echo "=========================================="


