#!/bin/bash
# 自动备份脚本 - 在编辑文件前运行此脚本

# 进入脚本所在目录
cd "$(dirname "$0")"

# 备份目录
BACKUP_DIR="./.backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 需要备份的文件
FILES=("app.js" "index.html" "styles.css")

echo "📦 开始备份文件..."

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        backup_file="$BACKUP_DIR/${file}.backup.$TIMESTAMP"
        cp "$file" "$backup_file"
        echo "✅ 已备份: $file -> $backup_file"
    else
        echo "⚠️  文件不存在: $file"
    fi
done

# 只保留最近10个备份
echo "🧹 清理旧备份（保留最近10个）..."
for file in "${FILES[@]}"; do
    ls -t "$BACKUP_DIR/${file}".backup.* 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null
done

echo "✨ 备份完成！"
echo "💡 提示：使用 'git status' 查看更改，使用 'git diff' 查看具体修改"

