# 原料板块部署说明

## ✅ 已完成步骤

1. ✅ **代码已提交到本地Git** - 所有后端和前端代码已提交
2. ✅ **数据库表已创建** - `ingredients` 表已成功创建（当前0条数据）
3. ✅ **后端服务已重启** - `petfresh-api` 服务运行正常
4. ✅ **前端服务已重启** - `web-frontend` 服务运行正常
5. ✅ **SQL文件已上传** - `create_ingredients_table.sql` 和迁移脚本已上传到服务器
6. ✅ **后端代码已部署** - 所有ingredients模块文件已部署到服务器

## ⚠️ 需要手动执行的步骤

### 步骤1：Git推送（如果需要）

如果GitHub SSH配置有问题，可以稍后手动推送：

```bash
git push origin main
```

或者使用HTTPS方式推送。

### 步骤2：数据迁移（可选）

如果需要迁移localStorage中的现有数据：

### 步骤3：验证后端API（可选）

```bash
# 测试API是否正常（需要先登录获取token）
curl -X GET http://localhost:3000/api/v1/health
```

### 步骤4：数据迁移（如果需要）

如果需要迁移localStorage中的现有数据：

1. **在浏览器控制台导出数据**：
   ```javascript
   // 打开Web应用，按F12打开控制台，执行：
   const data = JSON.parse(localStorage.getItem('pff-app-v2'));
   console.log(JSON.stringify(data.ingredients, null, 2));
   // 复制输出的JSON数据
   ```

2. **修改迁移脚本**：
   编辑 `backend/scripts/migrate-ingredients-from-localstorage.js`，将导出的JSON数据粘贴到 `ingredientsData` 变量中。

3. **执行迁移**：
   ```bash
   cd /root/web-admin/backend
   node scripts/migrate-ingredients-from-localstorage.js
   ```

## 🧪 测试步骤

### 1. 打开Web应用
访问：`http://8.137.166.134:8080`（或你的域名）

### 2. 登录
使用管理员账号登录

### 3. 进入原料板块
点击导航栏的"原料"按钮

### 4. 测试功能
- ✅ 列表加载：确认能正常显示原料列表
- ✅ 搜索功能：在搜索框输入关键词测试
- ✅ 筛选功能：选择类别筛选测试
- ✅ 分页功能：点击上一页/下一页测试
- ✅ 新增原料：点击"新增"按钮，填写表单并提交
- ✅ 编辑原料：点击某条原料的"编辑"按钮，修改并保存
- ✅ 删除原料：点击某条原料的"删除"按钮，确认删除

### 5. 检查控制台
打开浏览器开发者工具（F12），检查：
- Console标签：无错误信息
- Network标签：API请求状态码为200

## 🔍 常见问题

### 问题1：404错误
**原因**：路由未正确注册或服务未重启
**解决**：
```bash
# 检查路由是否注册
grep -r "ingredients" /root/web-admin/backend/src/routes/index.js

# 重启服务
pm2 restart petfresh-api
```

### 问题2：401错误
**原因**：未登录或token过期
**解决**：重新登录

### 问题3：500错误
**原因**：数据库表不存在或SQL错误
**解决**：
```bash
# 检查表是否存在
mysql -u root -p -e "USE petfresh; SHOW TABLES LIKE 'ingredients';"

# 如果不存在，执行SQL文件
mysql -u root -p < /root/web-admin/backend/sql/create_ingredients_table.sql
```

### 问题4：列表不显示
**原因**：API返回数据格式不正确
**解决**：检查Network请求的响应数据，确认格式为：
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 0,
    "page": 1,
    "pageSize": 20,
    "totalPages": 0
  }
}
```

## 📝 后续工作

1. **分类字段**：数据库已预留 `classification` 字段，后续可以在UI中添加分类管理功能
2. **价格更新功能**：如果需要采购员更新价格功能，可以添加专门的API端点
3. **数据验证**：确保所有必填字段都有验证
4. **错误处理**：完善错误提示信息

## 📞 需要帮助？

如果遇到问题，请检查：
1. 后端日志：`pm2 logs petfresh-api`
2. 前端控制台：浏览器F12
3. 数据库状态：`mysql -u root -p -e "USE petfresh; SHOW TABLES;"`

