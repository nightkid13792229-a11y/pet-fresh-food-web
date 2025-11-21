# 手动部署详细步骤

## 当前状态
- ✅ SQL 文件已复制到服务器
- ✅ 已通过 SSH 登录服务器

## 步骤 1：执行 SQL 创建表

在服务器终端执行：

```bash
mysql -u root -p petfresh < /root/create_audit_logs_table.sql
```

验证：
```bash
mysql -u root -p petfresh -e "SHOW TABLES LIKE 'audit_logs';"
```

---

## 步骤 2：安装 npm 依赖

```bash
cd /srv/petfresh-api
npm install bcryptjs jsonwebtoken
```

---

## 步骤 3：创建目录结构

```bash
cd /srv/petfresh-api
mkdir -p src/utils src/middleware src/modules/auth src/modules/users src/modules/audit
```

---

## 步骤 4：复制文件

由于需要密码，请在**本地新开一个终端窗口**，逐个执行以下命令：

```bash
cd /Users/zhaochen/Documents/cursor/pet-fresh-food-web

# 工具文件
scp backend/src/utils/password.js root@8.137.166.134:/srv/petfresh-api/src/utils/
scp backend/src/utils/token.js root@8.137.166.134:/srv/petfresh-api/src/utils/
scp backend/src/utils/response.js root@8.137.166.134:/srv/petfresh-api/src/utils/
scp backend/src/utils/audit-helper.js root@8.137.166.134:/srv/petfresh-api/src/utils/

# 中间件
scp backend/src/middleware/auth.js root@8.137.166.134:/srv/petfresh-api/src/middleware/
scp backend/src/middleware/validate.js root@8.137.166.134:/srv/petfresh-api/src/middleware/

# Auth 模块
scp backend/src/modules/auth/auth.routes.js root@8.137.166.134:/srv/petfresh-api/src/modules/auth/
scp backend/src/modules/auth/auth.controller.js root@8.137.166.134:/srv/petfresh-api/src/modules/auth/
scp backend/src/modules/auth/auth.schemas.js root@8.137.166.134:/srv/petfresh-api/src/modules/auth/

# Users 模块
scp backend/src/modules/users/users.repository.js root@8.137.166.134:/srv/petfresh-api/src/modules/users/
scp backend/src/modules/users/users.service.js root@8.137.166.134:/srv/petfresh-api/src/modules/users/
scp backend/src/modules/users/users.controller.js root@8.137.166.134:/srv/petfresh-api/src/modules/users/
scp backend/src/modules/users/users.routes.js root@8.137.166.134:/srv/petfresh-api/src/modules/users/

# Audit 模块
scp backend/src/modules/audit/audit.repository.js root@8.137.166.134:/srv/petfresh-api/src/modules/audit/
scp backend/src/modules/audit/audit.service.js root@8.137.166.134:/srv/petfresh-api/src/modules/audit/
scp backend/src/modules/audit/audit.controller.js root@8.137.166.134:/srv/petfresh-api/src/modules/audit/
scp backend/src/modules/audit/audit.routes.js root@8.137.166.134:/srv/petfresh-api/src/modules/audit/
```

**注意：** 每次执行 `scp` 命令时，系统会提示输入密码，输入服务器 root 密码即可。

---

## 步骤 5：修改 index.js

在服务器终端执行：

```bash
cd /srv/petfresh-api

# 备份
cp index.js index.js.backup.$(date +%Y%m%d_%H%M%S)

# 查看 breedsRouter 位置
grep -n "app.use.*breeds" index.js
```

然后编辑 `index.js`：

```bash
vim index.js
# 或
nano index.js
```

找到这一行（大约在第 52 行）：
```javascript
app.use('/api/v1/breeds', breedsRouter);
```

在这行**之后**添加：

```javascript
// Auth 和用户管理路由
const authRouter = require('./src/modules/auth/auth.routes');
const usersRouter = require('./src/modules/users/users.routes');
const auditRouter = require('./src/modules/audit/audit.routes');

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/audit', auditRouter);
```

**重要：** 确保这些代码在 `app.listen` **之前**。

保存后验证语法：
```bash
node -c index.js
```

---

## 步骤 6：重启服务

```bash
pm2 restart petfresh-api
pm2 logs petfresh-api --lines 50
```

---

## 步骤 7：测试

```bash
# 测试登录
curl -X POST http://127.0.0.1:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

如果返回包含 `token` 的 JSON，说明部署成功！


