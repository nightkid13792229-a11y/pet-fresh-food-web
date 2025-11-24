#!/bin/bash
# 服务器端部署脚本
# 在服务器上执行此脚本

set -e

echo "=== 开始部署到服务器 ==="

# 1. 进入后端目录
cd /root/web-admin/backend || { echo "❌ 后端目录不存在"; exit 1; }

# 2. 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main || { echo "❌ Git 拉取失败"; exit 1; }
echo "✅ 代码拉取成功"

# 3. 运行部署后处理脚本
echo "🔧 运行部署后处理..."
if [ -f "scripts/post-deploy.sh" ]; then
    bash scripts/post-deploy.sh
    echo "✅ 部署后处理完成"
else
    echo "⚠️  未找到 post-deploy.sh，跳过"
fi

# 4. 重启 PM2
echo "🔄 重启 PM2 进程..."
pm2 restart petfresh-api || { echo "❌ PM2 重启失败"; exit 1; }
echo "✅ PM2 重启成功"

# 5. 等待几秒后查看状态
sleep 3
echo ""
echo "📊 PM2 状态："
pm2 status

echo ""
echo "📋 最新日志（最后20行）："
pm2 logs petfresh-api --lines 20 --nostream

echo ""
echo "✅ 部署完成！"


