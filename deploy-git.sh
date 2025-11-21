#!/bin/bash

# 配置
REMOTE_NAME="origin"
BRANCH="main"
FILES="app.js index.html styles.css"

echo "=== Git 部署流程 ==="

# 1. 检查是否有修改
echo "1. 检查文件状态..."
modified_files=$(git status --porcelain $FILES 2>/dev/null | grep -E '^[ M]' || echo "")

if [ -n "$modified_files" ]; then
  echo "   发现以下文件有修改："
  echo "$modified_files" | sed 's/^/   /'
  
  read -p "   是否提交到 Git? (y/n): " commit_choice
  if [ "$commit_choice" = "y" ] || [ "$commit_choice" = "Y" ]; then
    git add $FILES
    read -p "   输入提交信息: " commit_msg
    if [ -z "$commit_msg" ]; then
      commit_msg="更新 Web 管理界面"
    fi
    git commit -m "$commit_msg"
    echo "   ✓ 已提交到本地 Git"
  else
    echo "   跳过提交"
    exit 0
  fi
else
  echo "   ✓ 没有修改，无需部署"
  exit 0
fi

# 2. 推送到远程仓库
echo "2. 推送到远程仓库..."
git push $REMOTE_NAME $BRANCH

if [ $? -eq 0 ]; then
  echo "   ✓ 推送成功"
else
  echo "   ✗ 推送失败"
  exit 1
fi

# 3. 在服务器上拉取更新
echo "3. 在服务器上更新..."
ssh root@8.137.166.134 "/root/web-admin/update.sh"

if [ $? -eq 0 ]; then
  echo ""
  echo "✓ 部署完成！"
  echo "访问: http://8.137.166.134:8080"
else
  echo ""
  echo "⚠ 代码已推送到远程，但服务器更新失败"
  echo "请手动在服务器上执行: cd /root/web-admin && git pull origin main"
fi
