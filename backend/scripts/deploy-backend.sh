#!/bin/bash
# 后端部署脚本（在服务器上执行）
# 用于拉取最新代码、安装依赖、运行部署后处理、重启 PM2

set -e

BACKEND_DIR="/root/web-admin/backend"
POST_DEPLOY_SCRIPT="$BACKEND_DIR/scripts/post-deploy.sh"

echo "=== 后端部署脚本 ==="
echo "后端目录: $BACKEND_DIR"

cd "$BACKEND_DIR"

# 1. 拉取最新代码
echo "1. 拉取最新代码..."
git pull origin main

# 2. 安装依赖（如果需要）
if [ -f "package.json" ]; then
  echo "2. 检查依赖..."
  if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo "   安装/更新依赖..."
    npm install --production
  else
    echo "   ✓ 依赖已是最新"
  fi
fi

# 3. 运行部署后处理脚本
if [ -f "$POST_DEPLOY_SCRIPT" ]; then
  echo "3. 运行部署后处理..."
  bash "$POST_DEPLOY_SCRIPT"
else
  echo "   警告: 未找到部署后处理脚本: $POST_DEPLOY_SCRIPT"
fi

# 4. 重启 PM2
echo "4. 重启 PM2..."
pm2 restart petfresh-api || pm2 start src/server.js --name petfresh-api --cwd "$BACKEND_DIR"

# 5. 保存 PM2 配置
pm2 save

echo ""
echo "=== 部署完成 ==="
echo "查看日志: pm2 logs petfresh-api"
echo "查看状态: pm2 status"

