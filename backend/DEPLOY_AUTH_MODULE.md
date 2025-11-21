# 部署 Auth 和用户管理模块到服务器

## 步骤 1：创建操作日志表

在服务器上执行：

```bash
mysql -u root -p petfresh < /path/to/create_audit_logs_table.sql
```

或者直接执行 SQL：

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL COMMENT '操作用户ID',
  action VARCHAR(60) NOT NULL COMMENT '操作类型',
  resource_type VARCHAR(60) COMMENT '资源类型',
  resource_id BIGINT UNSIGNED COMMENT '资源ID',
  description TEXT COMMENT '操作描述',
  ip_address VARCHAR(45) COMMENT 'IP地址',
  user_agent TEXT COMMENT '用户代理',
  metadata JSON COMMENT '额外数据',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created_at (created_at),
  CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 步骤 2：安装必要的 npm 包

在服务器上执行：

```bash
cd /srv/petfresh-api
npm install bcryptjs jsonwebtoken
```

## 步骤 3：复制文件到服务器

需要将以下文件复制到服务器：

### 工具文件
- `backend/src/utils/password.js`
- `backend/src/utils/token.js`
- `backend/src/utils/response.js`
- `backend/src/utils/audit-helper.js`

### 中间件
- `backend/src/middleware/auth.js`
- `backend/src/middleware/validate.js`

### Auth 模块
- `backend/src/modules/auth/auth.routes.js`
- `backend/src/modules/auth/auth.controller.js`
- `backend/src/modules/auth/auth.schemas.js`

### Users 模块
- `backend/src/modules/users/users.repository.js`
- `backend/src/modules/users/users.service.js`
- `backend/src/modules/users/users.controller.js`
- `backend/src/modules/users/users.routes.js`

### Audit 模块
- `backend/src/modules/audit/audit.repository.js`
- `backend/src/modules/audit/audit.service.js`
- `backend/src/modules/audit/audit.controller.js`
- `backend/src/modules/audit/audit.routes.js`

## 步骤 4：修改 index.js

在 `/srv/petfresh-api/index.js` 中添加路由注册：

```javascript
// 在 breedsRouter 之后添加
const authRouter = require('./src/modules/auth/auth.routes');
const usersRouter = require('./src/modules/users/users.routes');
const auditRouter = require('./src/modules/audit/audit.routes');

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/audit', auditRouter);
```

## 步骤 5：重启服务

```bash
pm2 restart petfresh-api
```

## 步骤 6：测试

```bash
# 测试登录
curl -X POST http://127.0.0.1:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# 测试获取用户列表（需要先登录获取 token）
curl -X GET http://127.0.0.1:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```


