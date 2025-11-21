# 后端部署脚本说明

## 脚本文件

### 1. `post-deploy.sh`
部署后处理脚本，用于解决 Node.js ESM 模块解析问题。

**功能：**
- 自动创建 `src/modules/db` 目录
- 优先尝试创建符号链接（更优雅）
- 如果符号链接失败，使用复制方案（更可靠）
- 验证路径是否正确

**使用场景：**
- 每次部署后自动运行
- 解决 `../../db/pool.js` 路径解析问题

### 2. `deploy-backend.sh`
完整的后端部署脚本，在服务器上执行。

**功能：**
1. 拉取最新代码（`git pull origin main`）
2. 安装/更新依赖（`npm install --production`）
3. 运行部署后处理脚本（`post-deploy.sh`）
4. 重启 PM2 应用
5. 保存 PM2 配置

**使用方法：**
```bash
# 在服务器上执行
cd /root/web-admin/backend
bash scripts/deploy-backend.sh
```

## 部署流程

### 本地开发环境

1. **修改代码**
2. **提交到 Git：**
   ```bash
   git add .
   git commit -m "你的提交信息"
   git push origin main
   ```

### 服务器部署

**方法 1：使用部署脚本（推荐）**
```bash
ssh root@8.137.166.134
cd /root/web-admin/backend
bash scripts/deploy-backend.sh
```

**方法 2：手动部署**
```bash
ssh root@8.137.166.134
cd /root/web-admin/backend

# 1. 拉取代码
git pull origin main

# 2. 安装依赖（如果需要）
npm install --production

# 3. 运行部署后处理
bash scripts/post-deploy.sh

# 4. 重启 PM2
pm2 restart petfresh-api
pm2 save
```

## 注意事项

1. **`src/modules/db` 目录：**
   - 这个目录是临时解决方案，用于解决 Node.js ESM 模块解析问题
   - 脚本会自动创建符号链接或复制文件
   - 不要手动删除这个目录

2. **环境变量：**
   - 确保 `.env` 文件在 `backend/` 目录下
   - 包含正确的数据库配置和 JWT_SECRET

3. **PM2 日志：**
   - 现在日志会输出到控制台，可以通过 `pm2 logs petfresh-api` 查看
   - 日志文件保存在 `/root/.pm2/logs/`

4. **数据库：**
   - 确保 MySQL 服务正在运行
   - 确保数据库 `petfresh` 已创建
   - 确保表结构已导入

## 故障排查

### 问题：模块找不到错误
```bash
# 手动运行部署后处理脚本
cd /root/web-admin/backend
bash scripts/post-deploy.sh
```

### 问题：环境变量未加载
```bash
# 检查 .env 文件
cat /root/web-admin/backend/.env

# 检查 env.js 是否正确加载
node -e "import('./src/config/env.js').then(() => console.log('DB_HOST:', process.env.DB_HOST))"
```

### 问题：PM2 应用无法启动
```bash
# 查看详细日志
pm2 logs petfresh-api --lines 50

# 检查应用状态
pm2 describe petfresh-api

# 直接运行测试
cd /root/web-admin/backend
NODE_ENV=production node src/server.js
```

