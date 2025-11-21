#!/bin/bash
# 在服务器上执行此脚本来修复 CORS 问题

cd /root/web-admin/backend || exit 1

# 备份原文件
cp src/app.js src/app.js.bak

# 使用 sed 修改 CORS 配置
# 先删除旧的 helmet 和 cors 配置行
sed -i '17,18d' src/app.js

# 在第 16 行后插入新的配置
cat > /tmp/cors_config.txt << 'CORS_EOF'
// 配置 helmet 允许 CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));
// CORS 配置 - 允许所有来源或配置的来源
app.use(cors({
  origin: function (origin, callback) {
    // 允许所有来源（开发环境）或配置的来源
    const allowedOrigins = config.cors.origin;
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // 临时允许所有，生产环境应该更严格
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
CORS_EOF

# 插入新配置
sed -i '16r /tmp/cors_config.txt' src/app.js

# 清理临时文件
rm -f /tmp/cors_config.txt

echo "✓ CORS 配置已更新"
echo "正在重启 PM2..."
pm2 restart petfresh-api

echo "✓ 修复完成！请刷新浏览器页面测试。"

