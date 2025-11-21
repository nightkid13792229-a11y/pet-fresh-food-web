# 部署指南

本文档说明如何使用新的标准化部署流程。

## 快速开始

### 在服务器上部署

```bash
# SSH 连接到服务器
ssh root@8.137.166.134

# 进入后端目录
cd /root/web-admin/backend

# 执行部署脚本
bash deploy.sh
```

## 部署脚本功能

`deploy.sh` 脚本会自动执行以下步骤：

1. ✅ **检查环境变量文件** - 确保 `.env` 文件存在
2. ✅ **拉取最新代码** - 从 Git 仓库拉取最新代码（如果适用）
3. ✅ **安装依赖** - 运行 `npm install --production`
4. ✅ **部署后处理** - 运行 `scripts/post-deploy.sh`（解决模块路径问题）
5. ✅ **重启 PM2** - 使用 `ecosystem.config.js` 重启应用
6. ✅ **健康检查** - 验证应用是否正常启动

## PM2 配置

新的 `ecosystem.config.js` 配置文件提供了：

- ✅ 明确的工作目录和启动脚本
- ✅ 环境变量文件路径配置
- ✅ 日志文件统一管理
- ✅ 自动重启策略
- ✅ 内存限制和重启延迟

### 使用 PM2 配置文件

```bash
# 启动应用
pm2 start ecosystem.config.js

# 重启应用（会重新加载环境变量）
pm2 restart ecosystem.config.js --update-env

# 停止应用
pm2 stop petfresh-api

# 删除应用
pm2 delete petfresh-api
```

## 环境变量验证

应用启动前会自动验证必要的环境变量：

**必需的变量：**
- `DB_HOST` - 数据库主机
- `DB_USER` - 数据库用户名
- `DB_PASSWORD` - 数据库密码
- `DB_NAME` - 数据库名称
- `JWT_SECRET` - JWT 密钥（至少 32 字符）

**可选的变量（有默认值）：**
- `DB_PORT` - 数据库端口（默认: 3306）
- `PORT` - 应用端口（默认: 3000）
- `NODE_ENV` - 环境（默认: production）
- `CORS_ORIGIN` - CORS 来源（默认: *）
- `JWT_EXPIRES_IN` - JWT 过期时间（默认: 24h）
- `BCRYPT_ROUNDS` - 密码加密轮数（默认: 10）
- `LOG_LEVEL` - 日志级别（默认: info）

如果缺少必需的变量，应用会在启动时退出并显示错误信息。

## 常见问题

### 1. 部署脚本执行失败

**问题：** `deploy.sh` 执行时出错

**解决：**
```bash
# 检查脚本权限
chmod +x deploy.sh

# 手动执行各个步骤
cd /root/web-admin/backend
git pull origin main
npm install --production
bash scripts/post-deploy.sh
pm2 restart ecosystem.config.js --update-env
```

### 2. PM2 应用启动失败

**问题：** `pm2 start ecosystem.config.js` 失败

**解决：**
```bash
# 查看详细日志
pm2 logs petfresh-api --lines 100

# 检查环境变量
cd /root/web-admin/backend
node -e "require('dotenv').config(); console.log(process.env.DB_HOST)"

# 手动验证环境变量
bash -c 'source .env && node src/server.js'
```

### 3. 环境变量验证失败

**问题：** 启动时提示缺少环境变量

**解决：**
```bash
# 检查 .env 文件
cat /root/web-admin/backend/.env

# 确保包含所有必需的变量
# 参考 backend/config/sample.env
```

### 4. 模块导入错误

**问题：** `ERR_MODULE_NOT_FOUND` 错误

**解决：**
```bash
# 运行部署后处理脚本
cd /root/web-admin/backend
bash scripts/post-deploy.sh

# 检查符号链接
ls -la src/modules/db
```

## 从旧部署方式迁移

如果你之前使用的是手动 PM2 启动，现在可以迁移到新配置：

```bash
# 1. 停止旧的应用
pm2 delete petfresh-api

# 2. 使用新配置启动
pm2 start ecosystem.config.js

# 3. 保存配置
pm2 save
```

## 监控和维护

### 查看应用状态

```bash
# 查看所有 PM2 应用
pm2 status

# 查看应用详情
pm2 describe petfresh-api

# 查看实时日志
pm2 logs petfresh-api

# 查看最近 50 行日志
pm2 logs petfresh-api --lines 50
```

### 重启应用

```bash
# 普通重启
pm2 restart petfresh-api

# 重启并更新环境变量
pm2 restart ecosystem.config.js --update-env

# 完全重启（清除缓存）
pm2 delete petfresh-api
pm2 start ecosystem.config.js
```

### 健康检查

应用提供了健康检查端点：

```bash
# 检查应用健康状态
curl http://localhost:3000/health

# 应该返回：
# {"status":"ok","timestamp":1234567890}
```

## 最佳实践

1. **部署前备份**
   ```bash
   # 备份当前代码
   cd /root/web-admin/backend
   git stash
   ```

2. **部署后验证**
   ```bash
   # 检查应用状态
   pm2 status
   
   # 检查日志
   pm2 logs petfresh-api --lines 20
   
   # 测试 API
   curl http://localhost:3000/health
   ```

3. **定期更新**
   ```bash
   # 定期拉取最新代码并部署
   cd /root/web-admin/backend
   bash deploy.sh
   ```

4. **监控日志**
   ```bash
   # 设置日志轮转（如果未安装）
   pm2 install pm2-logrotate
   ```

## 故障排除

如果遇到问题，按以下步骤排查：

1. **检查 PM2 状态**
   ```bash
   pm2 status
   pm2 logs petfresh-api --lines 50
   ```

2. **检查环境变量**
   ```bash
   cd /root/web-admin/backend
   node -e "import('./src/config/env-validator.js').then(m => m.validateEnv())"
   ```

3. **检查数据库连接**
   ```bash
   cd /root/web-admin/backend
   node -e "import('./src/db/pool.js').then(async ({getPool}) => { const p = await getPool(); await p.query('SELECT 1'); console.log('OK'); process.exit(0); })"
   ```

4. **检查文件权限**
   ```bash
   ls -la /root/web-admin/backend/src/server.js
   ls -la /root/web-admin/backend/.env
   ```

## 联系支持

如果问题持续存在，请提供以下信息：

- PM2 日志：`pm2 logs petfresh-api --lines 100`
- 环境变量检查结果（隐藏敏感信息）
- 部署脚本执行输出
- 错误堆栈信息

