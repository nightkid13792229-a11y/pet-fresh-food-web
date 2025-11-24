#!/bin/bash

# 自动化修复web-frontend的脚本
# 在服务器上执行: bash auto-fix-web.sh

set -e  # 遇到错误立即退出

echo "=== 开始修复web-frontend ==="

# 1. 进入后端目录并拉取最新代码
echo "1. 拉取最新代码..."
cd /root/web-admin/backend
git reset --hard origin/main 2>/dev/null || true
git pull origin main || {
    echo "⚠️ Git pull失败，继续使用当前代码..."
}

# 2. 检查并安装http-server
echo "2. 检查http-server..."
if ! command -v http-server &> /dev/null; then
    echo "   安装http-server..."
    npm install -g http-server || {
        echo "   ⚠️ npm安装失败，尝试使用npx..."
        # 如果npm安装失败，使用npx（不需要全局安装）
        HTTP_SERVER_CMD="npx http-server"
    }
else
    echo "   ✓ http-server已安装"
    HTTP_SERVER_CMD="http-server"
fi

# 3. 创建日志目录
echo "3. 创建日志目录..."
mkdir -p /root/web-admin/logs

# 4. 停止旧的web-frontend
echo "4. 停止旧的web-frontend服务..."
pm2 delete web-frontend 2>/dev/null || echo "   web-frontend未运行"

# 5. 检查ecosystem.config.cjs是否包含web-frontend配置
echo "5. 检查PM2配置..."
if grep -q "web-frontend" /root/web-admin/backend/ecosystem.config.cjs 2>/dev/null; then
    echo "   ✓ 配置文件中已包含web-frontend"
    # 使用配置文件启动
    cd /root/web-admin/backend
    pm2 start ecosystem.config.cjs
else
    echo "   ⚠️ 配置文件中没有web-frontend，手动启动..."
    # 手动启动web-frontend
    cd /root/web-admin
    if [ -n "$HTTP_SERVER_CMD" ]; then
        pm2 start "$HTTP_SERVER_CMD -p 8080 -a 0.0.0.0 --cors" --name web-frontend --interpreter none
    else
        # 如果http-server不可用，使用Python
        pm2 start "python3 -m http.server 8080" --name web-frontend --interpreter none
    fi
fi

# 6. 保存PM2配置
echo "6. 保存PM2配置..."
pm2 save

# 7. 等待服务启动
echo "7. 等待服务启动..."
sleep 3

# 8. 检查服务状态
echo ""
echo "=== 服务状态 ==="
pm2 status

# 9. 检查端口
echo ""
echo "=== 端口检查 ==="
if netstat -tlnp 2>/dev/null | grep -q 8080 || ss -tlnp 2>/dev/null | grep -q 8080; then
    echo "✓ 端口8080正在监听"
else
    echo "⚠️ 端口8080未被监听，请检查日志"
fi

# 10. 显示日志
echo ""
echo "=== web-frontend日志（最近10行） ==="
pm2 logs web-frontend --lines 10 --nostream 2>&1 | tail -15

echo ""
echo "=== 修复完成 ==="
echo "如果还有问题，请检查: pm2 logs web-frontend --lines 50"

