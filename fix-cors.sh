#!/bin/bash
# CORS 修复脚本 - 在服务器上执行

cat > /tmp/app.js.cors << 'EOF'
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import 'express-async-errors';

import config from './config/index.js';
import routes from './routes/index.js';
import requestLogger from './middleware/requestLogger.js';
import errorHandler from './middleware/errorHandler.js';
import notFound from './middleware/notFound.js';

const app = express();

// Core middleware
app.disable('x-powered-by');
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
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (combined with morgan & winston)
if (config.env !== 'test') {
  app.use(morgan('tiny', { stream: config.logger.stream }));
}
app.use(requestLogger);

// Routes
app.use('/api/v1', routes);

// Healthcheck for infra
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 404 & error handling
app.use(notFound);
app.use(errorHandler);

export default app;
EOF

echo "请在服务器上执行以下命令："
echo ""
echo "1. 备份原文件："
echo "   cd /root/web-admin/backend && cp src/app.js src/app.js.bak"
echo ""
echo "2. 复制修复后的文件："
echo "   cat > /root/web-admin/backend/src/app.js << 'APPJS_EOF'"
cat /tmp/app.js.cors
echo "APPJS_EOF"
echo ""
echo "3. 重启 PM2："
echo "   pm2 restart petfresh-api"
echo ""
echo "或者直接运行以下命令（需要手动复制上面的文件内容）："
echo "   cd /root/web-admin/backend"
echo "   nano src/app.js"
echo "   # 将第 17-36 行替换为上面的 CORS 配置"
echo "   pm2 restart petfresh-api"

