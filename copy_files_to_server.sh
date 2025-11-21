#!/bin/bash

# 文件复制脚本 - 在本地执行
# 使用方法：bash copy_files_to_server.sh

SERVER="root@8.137.166.134"
BASE_PATH="/srv/petfresh-api"

echo "开始复制文件到服务器..."

# 创建目录结构
echo "创建服务器目录结构..."
ssh $SERVER "cd $BASE_PATH && mkdir -p src/utils src/middleware src/modules/auth src/modules/users src/modules/audit"

# 复制工具文件
echo "复制工具文件..."
scp backend/src/utils/password.js $SERVER:$BASE_PATH/src/utils/
scp backend/src/utils/token.js $SERVER:$BASE_PATH/src/utils/
scp backend/src/utils/response.js $SERVER:$BASE_PATH/src/utils/
scp backend/src/utils/audit-helper.js $SERVER:$BASE_PATH/src/utils/

# 复制中间件
echo "复制中间件..."
scp backend/src/middleware/auth.js $SERVER:$BASE_PATH/src/middleware/
scp backend/src/middleware/validate.js $SERVER:$BASE_PATH/src/middleware/

# 复制 Auth 模块
echo "复制 Auth 模块..."
scp backend/src/modules/auth/auth.routes.js $SERVER:$BASE_PATH/src/modules/auth/
scp backend/src/modules/auth/auth.controller.js $SERVER:$BASE_PATH/src/modules/auth/
scp backend/src/modules/auth/auth.schemas.js $SERVER:$BASE_PATH/src/modules/auth/

# 复制 Users 模块
echo "复制 Users 模块..."
scp backend/src/modules/users/users.repository.js $SERVER:$BASE_PATH/src/modules/users/
scp backend/src/modules/users/users.service.js $SERVER:$BASE_PATH/src/modules/users/
scp backend/src/modules/users/users.controller.js $SERVER:$BASE_PATH/src/modules/users/
scp backend/src/modules/users/users.routes.js $SERVER:$BASE_PATH/src/modules/users/

# 复制 Audit 模块
echo "复制 Audit 模块..."
scp backend/src/modules/audit/audit.repository.js $SERVER:$BASE_PATH/src/modules/audit/
scp backend/src/modules/audit/audit.service.js $SERVER:$BASE_PATH/src/modules/audit/
scp backend/src/modules/audit/audit.controller.js $SERVER:$BASE_PATH/src/modules/audit/
scp backend/src/modules/audit/audit.routes.js $SERVER:$BASE_PATH/src/modules/audit/

# 复制部署脚本
echo "复制部署脚本..."
scp deploy_to_server.sh $SERVER:/root/

echo "✓ 所有文件复制完成！"
echo ""
echo "下一步："
echo "1. SSH 到服务器: ssh root@8.137.166.134"
echo "2. 执行部署脚本: bash /root/deploy_to_server.sh"


