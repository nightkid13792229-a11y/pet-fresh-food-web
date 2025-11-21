#!/bin/bash
# 统一部署脚本
# 用于在服务器上自动化部署后端应用

set -e  # 遇到错误立即退出

BACKEND_DIR="/root/web-admin/backend"
POST_DEPLOY_SCRIPT="$BACKEND_DIR/scripts/post-deploy.sh"
PM2_CONFIG="$BACKEND_DIR/ecosystem.config.cjs"

echo "=========================================="
echo "=== 后端应用部署脚本 ==="
echo "=========================================="
echo "后端目录: $BACKEND_DIR"
echo ""

# 检查是否在服务器上执行
if [ ! -d "$BACKEND_DIR" ]; then
  echo "❌ 错误: 后端目录不存在: $BACKEND_DIR"
  echo "   请确保在服务器上执行此脚本，或修改 BACKEND_DIR 变量"
  exit 1
fi

cd "$BACKEND_DIR" || exit 1

# 1. 检查 .env 文件
echo "1. 检查环境变量文件..."
if [ ! -f ".env" ]; then
  echo "   ❌ .env 文件不存在"
  echo "   请创建 .env 文件并配置必要的环境变量"
  exit 1
fi
echo "   ✅ .env 文件存在"

# 2. Git 拉取最新代码（如果在 Git 仓库中）
if [ -d ".git" ]; then
  echo ""
  echo "2. 拉取最新代码..."
  # 检查是否有未提交的修改
  if [ -n "$(git status --porcelain)" ]; then
    echo "   警告: 有未提交的修改，先暂存..."
    git stash
  fi
  
  # 确保在 main 分支
  git checkout main 2>/dev/null || git checkout -b main origin/main 2>/dev/null || true
  
  # 拉取最新代码
  if git pull origin main; then
    echo "   ✅ 代码已更新"
  else
    echo "   ⚠️  Git 拉取失败，继续使用当前代码"
  fi
  
  # 如果有暂存的修改，尝试恢复
  if [ -n "$(git stash list)" ]; then
    echo "   恢复暂存的修改..."
    git stash pop 2>/dev/null || true
  fi
else
  echo ""
  echo "2. 跳过 Git 拉取（不是 Git 仓库）"
fi

# 3. 安装/更新依赖
echo ""
echo "3. 检查依赖..."
if [ -f "package.json" ]; then
  if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo "   安装/更新依赖..."
    npm install --production
    echo "   ✅ 依赖安装完成"
  else
    echo "   ✅ 依赖已是最新"
  fi
else
  echo "   ⚠️  package.json 不存在，跳过依赖安装"
fi

# 4. 运行部署后处理脚本
echo ""
echo "4. 运行部署后处理..."
if [ -f "$POST_DEPLOY_SCRIPT" ]; then
  bash "$POST_DEPLOY_SCRIPT"
  echo "   ✅ 部署后处理完成"
else
  echo "   ⚠️  未找到部署后处理脚本: $POST_DEPLOY_SCRIPT"
fi

# 5. 重启 PM2
echo ""
echo "5. 重启 PM2 应用..."
if [ -f "$PM2_CONFIG" ]; then
  # 使用 ecosystem.config.cjs
  if pm2 list | grep -q "petfresh-api"; then
    echo "   重启现有应用..."
    pm2 restart ecosystem.config.cjs --update-env
  else
    echo "   启动新应用..."
    pm2 start ecosystem.config.cjs
  fi
else
  # 回退到直接启动
  echo "   使用回退方式启动..."
  if pm2 list | grep -q "petfresh-api"; then
    pm2 restart petfresh-api --update-env
  else
    pm2 start src/server.js --name petfresh-api --cwd "$BACKEND_DIR"
  fi
fi

# 保存 PM2 配置
pm2 save || echo "   ⚠️  PM2 保存配置失败（可忽略）"

# 6. 健康检查
echo ""
echo "6. 健康检查..."
sleep 3  # 等待应用启动

HEALTH_URL="http://localhost:${PORT:-3000}/health"
if curl -f -s "$HEALTH_URL" > /dev/null 2>&1; then
  echo "   ✅ 应用健康检查通过"
else
  echo "   ⚠️  健康检查失败，但应用可能仍在启动中"
  echo "   请手动检查: pm2 logs petfresh-api"
fi

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo ""
echo "常用命令:"
echo "  查看状态: pm2 status"
echo "  查看日志: pm2 logs petfresh-api"
echo "  查看最近日志: pm2 logs petfresh-api --lines 50"
echo "  重启应用: pm2 restart petfresh-api"
echo ""

