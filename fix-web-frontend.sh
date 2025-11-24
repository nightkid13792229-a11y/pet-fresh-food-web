#!/bin/bash

# 修复web-frontend的脚本
# 在服务器上执行此脚本

echo "=== 检查http-server是否已安装 ==="
if ! command -v http-server &> /dev/null; then
    echo "http-server未安装，正在安装..."
    npm install -g http-server
else
    echo "http-server已安装"
fi

echo ""
echo "=== 创建日志目录 ==="
mkdir -p /root/web-admin/logs

echo ""
echo "=== 更新PM2配置 ==="
cd /root/web-admin/backend
git pull origin main

echo ""
echo "=== 停止旧的web-frontend服务 ==="
pm2 delete web-frontend 2>/dev/null || echo "web-frontend未运行"

echo ""
echo "=== 使用新配置启动服务 ==="
cd /root/web-admin/backend
pm2 start ecosystem.config.cjs

echo ""
echo "=== 保存PM2配置 ==="
pm2 save

echo ""
echo "=== 检查服务状态 ==="
pm2 status

echo ""
echo "=== 检查端口8080 ==="
netstat -tlnp | grep 8080 || ss -tlnp | grep 8080 || echo "端口8080未被监听，请检查日志"

echo ""
echo "=== 查看web-frontend日志 ==="
pm2 logs web-frontend --lines 10 --nostream

