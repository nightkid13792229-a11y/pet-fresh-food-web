#!/bin/bash

# 诊断web前端服务状态的脚本
# 在服务器上执行此脚本来检查问题

echo "=== 检查PM2服务状态 ==="
pm2 status

echo ""
echo "=== 检查web-frontend日志（最近20行） ==="
pm2 logs web-frontend --lines 20 --nostream --err

echo ""
echo "=== 检查端口8080是否被监听 ==="
netstat -tlnp | grep 8080 || ss -tlnp | grep 8080 || echo "端口8080未被监听"

echo ""
echo "=== 检查web-frontend进程 ==="
ps aux | grep -E "web-frontend|http-server|python.*http.server|8080" | grep -v grep

echo ""
echo "=== 检查/root/web-admin目录 ==="
ls -la /root/web-admin/ | head -20

echo ""
echo "=== 检查PM2中web-frontend的配置 ==="
pm2 show web-frontend 2>/dev/null || echo "web-frontend未在PM2中配置"

