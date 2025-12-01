#!/bin/bash
echo "=== 开始部署修复 ==="
echo "1. 检查本地文件..."
grep -c "Edit button clicked" app.js && echo "✓ 本地文件包含新代码" || echo "✗ 本地文件缺少新代码"
echo ""
echo "2. 上传文件..."
scp app.js root@8.137.166.134:/root/web-admin/app.js
echo ""
echo "3. 验证服务器文件..."
ssh root@8.137.166.134 << 'ENDSSH'
echo "文件行数:"
wc -l /root/web-admin/app.js
echo ""
echo "检查关键代码:"
grep -c "Edit button clicked" /root/web-admin/app.js && echo "✓ 包含 Edit button clicked" || echo "✗ 缺少 Edit button clicked"
grep -c "EDIT MODE: Showing details section" /root/web-admin/app.js && echo "✓ 包含 EDIT MODE 日志" || echo "✗ 缺少 EDIT MODE 日志"
grep -c "=== openIngredientForm START v2 ===" /root/web-admin/app.js && echo "✓ 包含 v2 日志" || echo "✗ 缺少 v2 日志"
echo ""
echo "4. 重启服务..."
pm2 restart web-frontend
echo ""
echo "5. 检查服务状态..."
pm2 status web-frontend | grep web-frontend
ENDSSH
echo ""
echo "=== 部署完成 ==="
echo "请在浏览器中："
echo "1. 打开开发者工具 (F12)"
echo "2. 切换到 Network 标签"
echo "3. 勾选 'Disable cache'"
echo "4. 强制刷新 (Ctrl+F5 或 Cmd+Shift+R)"
echo "5. 点击 '编辑' 按钮，查看控制台日志"




