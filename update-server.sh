#!/bin/bash
# 服务器端更新脚本
# 在服务器上执行此脚本来更新代码并重启应用

echo "=== 服务器端更新脚本 ==="
echo ""

# 检查是否在服务器上
if [ ! -d "/root/web-admin/backend" ]; then
  echo "❌ 错误: 此脚本需要在服务器上执行"
  echo "   请先 SSH 连接到服务器: ssh root@8.137.166.134"
  exit 1
fi

cd /root/web-admin/backend || exit 1

# 1. 拉取最新代码
echo "1. 拉取最新代码..."
if [ -d ".git" ]; then
  # 暂存本地修改（如果有）
  if [ -n "$(git status --porcelain)" ]; then
    echo "   暂存本地修改..."
    git stash
  fi
  
  # 拉取代码
  if git pull origin main; then
    echo "   ✅ 代码已更新"
  else
    echo "   ⚠️  Git 拉取失败，继续使用当前代码"
  fi
else
  echo "   ⚠️  不是 Git 仓库，跳过代码拉取"
fi

# 2. 更新 ecosystem.config.js（确保是 CommonJS 格式）
echo ""
echo "2. 更新 PM2 配置文件..."
cat > ecosystem.config.js << 'ECOSYSTEM_EOF'
module.exports = {
  apps: [{
    name: 'petfresh-api',
    script: './src/server.js',
    cwd: '/root/web-admin/backend',
    interpreter: 'node',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    },
    env_file: '/root/web-admin/backend/.env',
    error_file: '/root/web-admin/backend/logs/pm2-error.log',
    out_file: '/root/web-admin/backend/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
};
ECOSYSTEM_EOF
echo "   ✅ PM2 配置已更新"

# 3. 运行部署后处理
echo ""
echo "3. 运行部署后处理..."
if [ -f "scripts/post-deploy.sh" ]; then
  bash scripts/post-deploy.sh
  echo "   ✅ 部署后处理完成"
else
  echo "   ⚠️  未找到部署后处理脚本"
fi

# 4. 重启 PM2
echo ""
echo "4. 重启 PM2 应用..."
# 先删除旧应用（如果存在）
pm2 delete petfresh-api 2>/dev/null || true

# 使用新配置启动
if pm2 start ecosystem.config.js; then
  echo "   ✅ PM2 应用已启动"
  pm2 save
else
  echo "   ❌ PM2 启动失败"
  exit 1
fi

# 5. 等待应用启动
echo ""
echo "5. 等待应用启动..."
sleep 3

# 6. 健康检查
echo ""
echo "6. 健康检查..."
if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "   ✅ 应用健康检查通过"
else
  echo "   ⚠️  健康检查失败，但应用可能仍在启动中"
  echo "   请检查日志: pm2 logs petfresh-api"
fi

# 7. 显示状态
echo ""
echo "=== 更新完成 ==="
echo ""
echo "PM2 状态:"
pm2 status
echo ""
echo "查看日志: pm2 logs petfresh-api --lines 20"


