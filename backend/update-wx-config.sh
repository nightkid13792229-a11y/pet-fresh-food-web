#!/bin/bash
# 更新微信小程序配置的脚本
# 在服务器上执行此脚本来更新 .env 文件中的微信配置

BACKEND_DIR="/root/web-admin/backend"
ENV_FILE="$BACKEND_DIR/.env"

echo "=========================================="
echo "=== 更新微信小程序配置 ==="
echo "=========================================="

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ 错误: .env 文件不存在: $ENV_FILE"
  exit 1
fi

# 备份原文件
cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ 已备份原 .env 文件"

# 更新或添加 WX_APP_ID 和 WX_APP_SECRET
cd "$BACKEND_DIR" || exit 1

# 使用 sed 更新或添加配置
if grep -q "^WX_APP_ID=" "$ENV_FILE"; then
  # 如果存在，更新它
  sed -i 's|^WX_APP_ID=.*|WX_APP_ID=wx2c1e8f1a2d7c2406|' "$ENV_FILE"
  echo "✅ 已更新 WX_APP_ID"
else
  # 如果不存在，添加到文件末尾
  echo "WX_APP_ID=wx2c1e8f1a2d7c2406" >> "$ENV_FILE"
  echo "✅ 已添加 WX_APP_ID"
fi

if grep -q "^WX_APP_SECRET=" "$ENV_FILE"; then
  # 如果存在，更新它
  sed -i 's|^WX_APP_SECRET=.*|WX_APP_SECRET=15487442b585f56437c3d2cd5581ab79|' "$ENV_FILE"
  echo "✅ 已更新 WX_APP_SECRET"
else
  # 如果不存在，添加到文件末尾
  echo "WX_APP_SECRET=15487442b585f56437c3d2cd5581ab79" >> "$ENV_FILE"
  echo "✅ 已添加 WX_APP_SECRET"
fi

echo ""
echo "=========================================="
echo "✅ 配置更新完成！"
echo "=========================================="
echo ""
echo "更新后的配置："
grep "^WX_APP" "$ENV_FILE" | sed 's/SECRET=.*/SECRET=***隐藏***/'
echo ""
echo "下一步："
echo "1. 重启 PM2 应用以加载新配置："
echo "   pm2 restart petfresh-api --update-env"
echo ""
echo "2. 查看日志确认配置生效："
echo "   pm2 logs petfresh-api --lines 20"
echo ""

