#!/bin/bash
# 部署后处理脚本
# 用于解决 Node.js ESM 模块解析问题（src/modules/db/pool.js）

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== 部署后处理脚本 ==="
echo "后端目录: $BACKEND_DIR"

MODULES_DB_DIR="$BACKEND_DIR/src/modules/db"
DB_DIR="$BACKEND_DIR/src/db"

# 确保 src/modules 目录存在
mkdir -p "$BACKEND_DIR/src/modules"

# 检查是否已经存在且正确
if [ -L "$MODULES_DB_DIR" ]; then
  # 如果是符号链接，检查是否有效
  TARGET=$(readlink -f "$MODULES_DB_DIR" 2>/dev/null || echo "")
  if [ "$TARGET" = "$DB_DIR" ] && [ -f "$MODULES_DB_DIR/pool.js" ]; then
    echo "✓ 符号链接已存在且正确: $MODULES_DB_DIR -> $DB_DIR"
    exit 0
  else
    echo "警告: 符号链接无效，将重新创建"
    rm -f "$MODULES_DB_DIR"
  fi
elif [ -d "$MODULES_DB_DIR" ]; then
  # 如果是目录，检查是否包含 pool.js
  if [ -f "$MODULES_DB_DIR/pool.js" ]; then
    echo "✓ src/modules/db 目录已存在且包含 pool.js"
    exit 0
  else
    echo "警告: 目录存在但不完整，将重新创建"
    rm -rf "$MODULES_DB_DIR"
  fi
fi

# 尝试创建符号链接
echo "尝试创建符号链接..."
if ln -sf "$DB_DIR" "$MODULES_DB_DIR" 2>/dev/null; then
  # 验证符号链接
  if [ -f "$MODULES_DB_DIR/pool.js" ]; then
    echo "✓ 符号链接创建并验证成功: $MODULES_DB_DIR -> $DB_DIR"
    exit 0
  else
    echo "警告: 符号链接创建成功但验证失败，将使用复制方案"
    rm -f "$MODULES_DB_DIR" 2>/dev/null || rm -rf "$MODULES_DB_DIR"
  fi
fi

# 如果符号链接失败，使用复制方案
echo "使用复制方案..."
if [ -d "$DB_DIR" ]; then
  mkdir -p "$MODULES_DB_DIR"
  cp -r "$DB_DIR"/* "$MODULES_DB_DIR/" 2>/dev/null || {
    echo "错误: 无法复制文件"
    exit 1
  }
  echo "✓ 已复制 db 目录到 src/modules/db"
else
  echo "错误: 源目录 $DB_DIR 不存在"
  exit 1
fi

echo "=== 部署后处理完成 ==="

