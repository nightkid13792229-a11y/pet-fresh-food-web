# 自动化部署说明

## 当前问题
- Git推送需要SSH密钥配置（GitHub认证）
- 服务器SSH需要密码或密钥

## 快速修复web-frontend

由于SSH权限问题，请在服务器上直接执行以下命令：

### 方法1：使用自动化脚本（推荐）

```bash
# 1. 将脚本复制到服务器（在本地执行）
scp auto-fix-web.sh root@8.137.166.134:/root/

# 2. 在服务器上执行
ssh root@8.137.166.134
bash /root/auto-fix-web.sh
```

### 方法2：手动执行命令

```bash
ssh root@8.137.166.134

# 然后执行：
cd /root/web-admin/backend
git pull origin main

# 安装http-server（如果未安装）
npm install -g http-server || npx http-server --version

# 创建日志目录
mkdir -p /root/web-admin/logs

# 停止旧服务
pm2 delete web-frontend 2>/dev/null

# 使用新配置启动
cd /root/web-admin/backend
pm2 start ecosystem.config.cjs

# 保存配置
pm2 save

# 检查状态
pm2 status
pm2 logs web-frontend --lines 20
```

## 解决SSH权限问题（可选）

### 1. 配置服务器SSH密钥（免密登录）

在本地生成密钥对（如果还没有）：
```bash
ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/server_key
```

将公钥复制到服务器：
```bash
ssh-copy-id -i ~/.ssh/server_key.pub root@8.137.166.134
```

### 2. 配置GitHub SSH密钥

确保本地SSH密钥已添加到GitHub：
1. 查看公钥：`cat ~/.ssh/id_ed25519.pub`
2. 添加到GitHub：https://github.com/settings/keys
3. 测试：`ssh -T git@github.com`

## 自动化部署流程（配置完成后）

配置好SSH后，可以使用以下流程：

```bash
# 1. 本地推送代码
git push origin main

# 2. 服务器上拉取并重启
ssh root@8.137.166.134 'cd /root/web-admin/backend && git pull origin main && pm2 restart all'
```

