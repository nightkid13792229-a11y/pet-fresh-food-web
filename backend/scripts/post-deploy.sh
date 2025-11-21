#!/bin/bash
# 部署后处理脚本
# 用于解决 Node.js ESM 模块解析问题（src/modules/db/pool.js）

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== 部署后处理脚本 ==="
echo "后端目录: $BACKEND_DIR"

# 创建 src/modules/db 目录（如果不存在）
MODULES_DB_DIR="$BACKEND_DIR/src/modules/db"
DB_DIR="$BACKEND_DIR/src/db"

if [ ! -d "$MODULES_DB_DIR" ]; then
  echo "创建 src/modules/db 目录..."
  mkdir -p "$MODULES_DB_DIR"
fi

# 检查是否已经存在（可能是符号链接或目录）
if [ -L "$MODULES_DB_DIR" ] || [ -d "$MODULES_DB_DIR" ]; then
  # 如果是符号链接，检查是否有效
  if [ -L "$MODULES_DB_DIR" ]; then
    TARGET=$(readlink -f "$MODULES_DB_DIR")
    if [ "$TARGET" = "$DB_DIR" ]; then
      echo "✓ 符号链接已存在且正确: $MODULES_DB_DIR -> $DB_DIR"
      exit 0
    else
      echo "警告: 符号链接指向错误位置，将重新创建"
      rm -f "$MODULES_DB_DIR"
    fi
  fi
  
  # 如果是目录，检查是否包含 pool.js
  if [ -d "$MODULES_DB_DIR" ] && [ -f "$MODULES_DB_DIR/pool.js" ]; then
    echo "✓ src/modules/db 目录已存在且包含 pool.js"
    exit 0
  fi
fi

# 尝试创建符号链接
echo "尝试创建符号链接..."
if ln -sf "$DB_DIR" "$MODULES_DB_DIR" 2>/dev/null; then
  echo "✓ 已创建符号链接: $MODULES_DB_DIR -> $DB_DIR"
  
  # 验证符号链接
  if [ -f "$MODULES_DB_DIR/pool.js" ]; then
    echo "✓ 符号链接验证成功"
    exit 0
  else
    echo "警告: 符号链接创建成功但验证失败，将使用复制方案"
    rm -f "$MODULES_DB_DIR"
  fi
fi

# 如果符号链接失败，使用复制方案
echo "使用复制方案..."
if [ -d "$DB_DIR" ]; then
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

