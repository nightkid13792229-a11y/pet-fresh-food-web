#!/bin/bash
# 统一部署脚本 - 使用 Git 部署前端和后端

echo "=== 统一 Git 部署流程 ==="
echo ""

# 配置
REMOTE_NAME="origin"
BRANCH="main"

# 1. 检查是否有未提交的修改
echo "1. 检查文件状态..."
if [ -n "$(git status --porcelain)" ]; then
  echo "   发现未提交的修改："
  git status --short
  echo ""
  read -p "   是否提交并推送? (y/n): " commit_choice
  if [ "$commit_choice" = "y" ] || [ "$commit_choice" = "Y" ]; then
    git add .
    read -p "   输入提交信息 (直接回车使用默认): " commit_msg
    if [ -z "$commit_msg" ]; then
      commit_msg="更新代码: $(date +'%Y-%m-%d %H:%M:%S')"
    fi
    git commit -m "$commit_msg"
    echo "   ✓ 已提交到本地 Git"
  else
    echo "   ⚠️  跳过提交，将部署当前已提交的代码"
  fi
else
  echo "   ✓ 没有未提交的修改"
fi

# 2. 推送到远程仓库
echo ""
echo "2. 推送到远程仓库..."
if git push $REMOTE_NAME $BRANCH; then
  echo "   ✓ 推送成功"
else
  echo "   ✗ 推送失败"
  read -p "   是否继续部署? (y/n): " continue_choice
  if [ "$continue_choice" != "y" ] && [ "$continue_choice" != "Y" ]; then
    exit 1
  fi
fi

# 3. 在服务器上拉取更新
echo ""
echo "3. 在服务器上更新代码..."
ssh root@8.137.166.134 << 'ENDSSH'
cd /root/web-admin

# 检查是否有未提交的修改
if [ -n "$(git status --porcelain)" ]; then
  echo "   发现未提交的修改，暂存它们..."
  git stash
fi

# 拉取最新代码（前端和后端一起更新，因为它们在同一个仓库中）
if git pull origin main; then
  echo "   ✓ 代码已更新（前端和后端）"
else
  echo "   ✗ 代码更新失败"
  exit 1
fi

# 运行后端部署后处理
if [ -f "scripts/post-deploy.sh" ]; then
  echo "   运行后端部署后处理..."
  bash scripts/post-deploy.sh
fi

# 重启后端服务
echo "   重启后端服务..."
pm2 restart backend

# 显示状态
echo ""
echo "=== 部署完成 ==="
pm2 status | grep -E "backend|web-frontend"
ENDSSH

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 部署成功！"
  echo "访问: http://8.137.166.134:8080"
else
  echo ""
  echo "❌ 部署失败，请检查服务器日志"
fi

