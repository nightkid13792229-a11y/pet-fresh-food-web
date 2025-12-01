#!/bin/bash
# 完整部署脚本 - 部署所有文件并验证

echo "=== 开始部署 ==="
echo ""

# 1. 部署文件
echo "1. 上传文件到服务器..."
scp app.js sw.js index.html styles.css root@8.137.166.134:/root/web-admin/

if [ $? -ne 0 ]; then
  echo "❌ 文件上传失败"
  exit 1
fi

echo "✅ 文件上传成功"
echo ""

# 2. 验证服务器文件
echo "2. 验证服务器文件..."
ssh root@8.137.166.134 << 'ENDSSH'
echo "检查文件大小:"
ls -lh /root/web-admin/app.js /root/web-admin/sw.js 2>/dev/null | awk '{print $5, $9}'
echo ""
echo "检查app.js是否包含新代码:"
grep -c "openIngredientForm called" /root/web-admin/app.js && echo "✅ 包含新代码" || echo "❌ 不包含新代码"
echo ""
echo "检查sw.js缓存版本:"
grep "CACHE_NAME" /root/web-admin/sw.js | head -1
ENDSSH

echo ""

# 3. 重启服务
echo "3. 重启PM2服务..."
ssh root@8.137.166.134 'pm2 restart web-frontend && pm2 status web-frontend | grep web-frontend'

echo ""
echo "=== 部署完成 ==="
echo ""
echo "⚠️  重要提示："
echo "1. 打开浏览器开发者工具 (F12)"
echo "2. 切换到 Application 标签"
echo "3. 点击左侧 'Service Workers'"
echo "4. 点击 'Unregister' 注销旧的 Service Worker"
echo "5. 或者在 Console 中运行: navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()))"
echo "6. 切换到 Network 标签，勾选 'Disable cache'"
echo "7. 强制刷新页面 (Ctrl+F5 或 Cmd+Shift+R)"
echo "8. 点击 '新增' 按钮，查看控制台日志"




