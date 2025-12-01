#!/bin/bash
# 原料板块部署脚本

echo "=== 原料板块部署脚本 ==="
echo ""

# 检查是否在服务器上
if [ ! -f "/root/web-admin/backend/package.json" ]; then
    echo "❌ 错误：请在服务器上执行此脚本"
    exit 1
fi

cd /root/web-admin/backend

# 步骤1：创建数据库表
echo "步骤1：创建数据库表..."
if [ -f "sql/create_ingredients_table.sql" ]; then
    # 尝试从.env读取数据库密码
    if [ -f ".env" ]; then
        DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d= -f2)
        if [ -n "$DB_PASSWORD" ]; then
            mysql -u root -p"$DB_PASSWORD" < sql/create_ingredients_table.sql 2>&1
            if [ $? -eq 0 ]; then
                echo "✓ 数据库表创建成功"
            else
                echo "⚠ 使用.env中的密码失败，请手动执行："
                echo "   mysql -u root -p < sql/create_ingredients_table.sql"
            fi
        else
            echo "⚠ .env中未找到DB_PASSWORD，请手动执行："
            echo "   mysql -u root -p < sql/create_ingredients_table.sql"
        fi
    else
        echo "⚠ 未找到.env文件，请手动执行："
        echo "   mysql -u root -p < sql/create_ingredients_table.sql"
    fi
else
    echo "❌ SQL文件不存在：sql/create_ingredients_table.sql"
    exit 1
fi

# 步骤2：验证表创建
echo ""
echo "步骤2：验证表创建..."
mysql -u root -p"${DB_PASSWORD:-}" -e "USE petfresh; SHOW TABLES LIKE 'ingredients';" 2>&1 | grep -q ingredients
if [ $? -eq 0 ]; then
    echo "✓ ingredients表已存在"
    mysql -u root -p"${DB_PASSWORD:-}" -e "USE petfresh; SELECT COUNT(*) as total FROM ingredients;" 2>&1
else
    echo "⚠ 表可能不存在，请检查上面的错误信息"
fi

# 步骤3：重启后端服务
echo ""
echo "步骤3：重启后端服务..."
pm2 restart petfresh-api --update-env
sleep 2
pm2 status petfresh-api | grep petfresh-api

# 步骤4：检查服务状态
echo ""
echo "步骤4：检查服务状态..."
pm2 logs petfresh-api --lines 5 --nostream | tail -5

echo ""
echo "=== 部署完成 ==="
echo ""
echo "下一步："
echo "1. 访问Web应用：http://8.137.166.134:8080"
echo "2. 登录后进入'原料'板块测试功能"
echo "3. 如需迁移数据，执行：node scripts/migrate-ingredients-from-localstorage.js"




