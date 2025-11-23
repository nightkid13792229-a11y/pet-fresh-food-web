#!/bin/bash
# 在服务器上执行的更新命令
# 使用方法：复制以下命令到服务器终端执行

echo "=== 服务器更新命令 ==="
echo ""
echo "请在服务器上执行以下命令："
echo ""
echo "cd /root/web-admin/backend"
echo ""
echo "# 1. 拉取最新代码"
echo "git pull origin main || echo 'Git 拉取失败或不是 Git 仓库'"
echo ""
echo "# 2. 更新 ecosystem.config.js"
echo "cat > ecosystem.config.js << 'EOF'"
cat backend/ecosystem.config.js
echo "EOF"
echo ""
echo "# 3. 运行部署后处理"
echo "bash scripts/post-deploy.sh"
echo ""
echo "# 4. 重启 PM2"
echo "pm2 delete petfresh-api 2>/dev/null || true"
echo "pm2 start ecosystem.config.js"
echo "pm2 save"
echo ""
echo "# 5. 查看状态"
echo "pm2 status"
echo "pm2 logs petfresh-api --lines 20"

