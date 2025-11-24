#!/bin/bash

# 部署脚本 - 将代码部署到服务器
# 使用方法: ./deploy.sh

SERVER="root@8.137.166.134"
SERVER_PATH="/root/web-admin"

echo "🚀 开始部署..."

# 1. 推送代码到GitHub（如果SSH配置好了）
echo "📤 尝试推送到GitHub..."
if git push origin main 2>/dev/null; then
    echo "✅ 代码已推送到GitHub"
    echo ""
    echo "📥 请在服务器上执行以下命令拉取代码："
    echo "   cd $SERVER_PATH/backend && git pull origin main"
    echo "   cd $SERVER_PATH && git pull origin main  # 如果有前端代码也在git中"
    echo "   pm2 restart petfresh-api --update-env"
    echo "   pm2 restart web-frontend"
else
    echo "⚠️  GitHub推送失败，使用scp直接部署..."
    echo ""
    
    # 2. 使用scp部署后端文件
    echo "📦 部署后端文件..."
    scp backend/src/modules/pets/pets.repository.js $SERVER:$SERVER_PATH/backend/src/modules/pets/pets.repository.js
    scp backend/src/modules/pets/pets.service.js $SERVER:$SERVER_PATH/backend/src/modules/pets/pets.service.js
    scp backend/src/modules/profile/profile.controller.js $SERVER:$SERVER_PATH/backend/src/modules/profile/profile.controller.js
    scp backend/src/modules/profile/profile.service.js $SERVER:$SERVER_PATH/backend/src/modules/profile/profile.service.js
    scp backend/src/modules/addresses/addresses.controller.js $SERVER:$SERVER_PATH/backend/src/modules/addresses/addresses.controller.js
    
    # 3. 使用scp部署前端文件
    echo "📦 部署前端文件..."
    scp app.js $SERVER:$SERVER_PATH/app.js
    
    # 4. 重启服务
    echo "🔄 重启服务..."
    ssh $SERVER "cd $SERVER_PATH/backend && pm2 restart petfresh-api --update-env"
    ssh $SERVER "cd $SERVER_PATH && pm2 restart web-frontend"
    
    echo ""
    echo "✅ 部署完成！"
fi

