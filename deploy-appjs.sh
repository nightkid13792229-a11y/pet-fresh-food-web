#!/bin/bash
# 部署 app.js 到服务器

echo "=== 开始部署 app.js ==="
echo "本地文件大小:"
ls -lh app.js

echo ""
echo "上传文件..."
scp app.js root@8.137.166.134:/root/web-admin/app.js

echo ""
echo "验证服务器文件..."
ssh root@8.137.166.134 << 'ENDSSH'
echo "服务器文件大小:"
ls -lh /root/web-admin/app.js
echo ""
echo "检查是否包含新代码:"
grep -c "openIngredientForm called" /root/web-admin/app.js
echo ""
echo "重启服务..."
pm2 restart web-frontend
echo ""
echo "检查服务状态:"
pm2 status web-frontend
ENDSSH

echo ""
echo "=== 部署完成 ==="
echo "请在浏览器中:"
echo "1. 打开开发者工具 (F12)"
echo "2. 切换到 Network 标签"
echo "3. 勾选 'Disable cache'"
echo "4. 强制刷新 (Ctrl+F5 或 Cmd+Shift+R)"
echo "5. 点击 '新增' 按钮，查看控制台日志"




