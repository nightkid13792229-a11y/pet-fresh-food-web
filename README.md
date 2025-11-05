# 宠物鲜食助手

一个用于管理宠物鲜食业务的专业工具，包含顾客信息管理、食谱管理、食材采购、订单生成等功能。

## 功能模块

- ✅ **顾客与宠物信息管理** - 完整的CRUD功能，支持自动能量估算
- 🚧 食谱库（开发中）
- 🚧 食材与采购记录（开发中）
- 🚧 订单与采购清单（开发中）
- 🚧 标签打印（开发中）

## 版本控制和备份

### Git 版本控制

本项目使用 Git 进行版本控制。以下是一些常用命令：

#### 查看状态
```bash
git status
```

#### 提交更改
```bash
# 添加所有更改的文件
git add .

# 提交更改（带描述信息）
git commit -m "你的修改说明"
```

#### 查看历史
```bash
# 查看提交历史
git log --oneline

# 查看具体某个文件的修改历史
git log --oneline app.js
```

#### 恢复文件
```bash
# 恢复到上次提交的版本
git checkout -- app.js

# 恢复到某个特定的提交
git checkout <commit-id> -- app.js
```

#### 撤销未提交的更改
```bash
# 查看更改内容
git diff

# 撤销工作区的更改
git restore <文件名>

# 撤销已暂存的文件
git restore --staged <文件名>
```

### 自动备份脚本

在修改重要文件前，可以运行备份脚本：

```bash
./backup.sh
```

这会自动备份 `app.js`、`index.html`、`styles.css` 到 `.backups/` 目录，并保留最近10个备份。

### 最佳实践

1. **修改前先提交当前版本**
   ```bash
   git add .
   git commit -m "修改前的备份"
   ```

2. **或者使用备份脚本**
   ```bash
   ./backup.sh
   ```

3. **经常提交**：每完成一个小功能就提交一次，方便回退

4. **提交信息要清晰**：用简洁的中文描述你做了什么修改

## 开发环境

- 使用本地 HTTP 服务器运行（不能直接用 file:// 协议）
- 在项目目录下运行：`python3 -m http.server`
- 浏览器访问：`http://localhost:8000`

## 技术栈

- 纯 HTML/CSS/JavaScript（PWA）
- LocalStorage 存储数据
- 响应式设计，支持 macOS 和 Android 浏览器
