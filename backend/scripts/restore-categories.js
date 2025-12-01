#!/usr/bin/env node

/**
 * 恢复原料分类数据
 * 1. 检查 ingredient_categories 表是否存在，不存在则创建
 * 2. 从 ingredients 表中提取所有唯一的分类并保存到 ingredient_categories 表
 * 3. 显示恢复的数据统计
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import mysql from 'mysql2/promise';

// 加载环境变量
const scriptDir = dirname(fileURLToPath(import.meta.url));
const envPath = join(scriptDir, '..', '.env');
if (existsSync(envPath)) {
  config({ path: envPath });
  console.log(`✓ 已加载环境变量文件: ${envPath}`);
} else {
  console.warn(`⚠ 警告: 未找到 .env 文件: ${envPath}`);
  console.warn('将尝试使用系统环境变量或命令行参数');
}

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || process.argv[2] || 'localhost',
  port: Number(process.env.DB_PORT || process.argv[3] || 3306),
  user: process.env.DB_USER || process.argv[4] || 'root',
  password: process.env.DB_PASSWORD || process.argv[5] || '',
  database: process.env.DB_NAME || process.argv[6] || 'petfresh'
};

async function restoreCategories() {
  let connection;
  
  try {
    console.log('\n=== 开始恢复原料分类数据 ===\n');
    console.log('数据库配置:');
    console.log(`  主机: ${dbConfig.host}`);
    console.log(`  端口: ${dbConfig.port}`);
    console.log(`  用户: ${dbConfig.user}`);
    console.log(`  数据库: ${dbConfig.database}\n`);
    
    // 连接数据库
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      multipleStatements: true
    });
    
    console.log('✓ 数据库连接成功\n');
    
    // 1. 检查表是否存在
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'ingredient_categories'"
    );
    
    if (tables.length === 0) {
      console.log('📋 表不存在，正在创建 ingredient_categories 表...');
      
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS ingredient_categories (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          classification VARCHAR(100) NOT NULL COMMENT '原料分类（食材、营养补充剂、包材）',
          category VARCHAR(100) NOT NULL COMMENT '类别名称',
          display_order INT DEFAULT 0 COMMENT '显示顺序',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_by BIGINT UNSIGNED COMMENT '创建人ID',
          updated_by BIGINT UNSIGNED COMMENT '最后更新人ID',
          
          UNIQUE KEY uk_classification_category (classification, category),
          INDEX idx_classification (classification),
          INDEX idx_display_order (display_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='原料分类表'
      `);
      
      console.log('✓ 表创建成功\n');
    } else {
      console.log('✓ 表已存在\n');
    }
    
    // 2. 检查现有数据
    const [existingRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM ingredient_categories'
    );
    const existingCount = existingRows[0].count;
    console.log(`📊 表中现有数据: ${existingCount} 条\n`);
    
    // 3. 从 ingredients 表中提取所有唯一的分类
    console.log('🔍 正在从 ingredients 表中提取分类数据...');
    
    const [ingredients] = await connection.execute(`
      SELECT DISTINCT 
        classification,
        category,
        COUNT(*) as usage_count
      FROM ingredients
      WHERE classification IS NOT NULL 
        AND classification != ''
        AND category IS NOT NULL 
        AND category != ''
      GROUP BY classification, category
      ORDER BY classification, category
    `);
    
    console.log(`✓ 从 ingredients 表中找到 ${ingredients.length} 个唯一的分类\n`);
    
    if (ingredients.length === 0) {
      console.log('⚠ 警告: ingredients 表中没有找到任何分类数据');
      console.log('   可能原因:');
      console.log('   1. ingredients 表为空');
      console.log('   2. ingredients 表中的分类字段为空');
      console.log('\n建议: 如果之前有手动编辑的分类，可能需要重新导入预设分类。\n');
    } else {
      // 4. 插入分类到 ingredient_categories 表
      console.log('💾 正在保存分类到 ingredient_categories 表...');
      
      let inserted = 0;
      let skipped = 0;
      
      for (const ing of ingredients) {
        try {
          await connection.execute(`
            INSERT IGNORE INTO ingredient_categories 
              (classification, category, display_order, created_at, updated_at)
            VALUES (?, ?, 0, NOW(), NOW())
          `, [ing.classification, ing.category]);
          
          // 检查是否实际插入了（通过 ROW_COUNT()）
          const [result] = await connection.execute('SELECT ROW_COUNT() as affected');
          if (result[0].affected > 0) {
            inserted++;
          } else {
            skipped++;
          }
        } catch (error) {
          if (error.code === 'ER_DUP_ENTRY') {
            skipped++;
          } else {
            console.error(`  错误: 插入分类失败 [${ing.classification}] ${ing.category}:`, error.message);
          }
        }
      }
      
      console.log(`✓ 插入完成: 新增 ${inserted} 条，跳过 ${skipped} 条（已存在）\n`);
    }
    
    // 5. 显示最终统计
    const [finalRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM ingredient_categories'
    );
    const finalCount = finalRows[0].count;
    
    console.log('📊 最终统计:');
    console.log(`   总分类数: ${finalCount} 条\n`);
    
    // 6. 按分类显示所有数据
    const [allCategories] = await connection.execute(`
      SELECT 
        classification,
        category,
        display_order,
        created_at,
        (SELECT COUNT(*) FROM ingredients i 
         WHERE i.classification = ic.classification 
         AND i.category = ic.category) as usage_count
      FROM ingredient_categories ic
      ORDER BY classification, display_order, category
    `);
    
    if (allCategories.length > 0) {
      console.log('📋 所有分类数据:');
      console.log('─'.repeat(80));
      
      const byClassification = {};
      allCategories.forEach(cat => {
        if (!byClassification[cat.classification]) {
          byClassification[cat.classification] = [];
        }
        byClassification[cat.classification].push(cat);
      });
      
      Object.keys(byClassification).sort().forEach(classification => {
        const cats = byClassification[classification];
        console.log(`\n【${classification}】(${cats.length} 个分类):`);
        cats.forEach((cat, index) => {
          console.log(`  ${index + 1}. ${cat.category} (使用次数: ${cat.usage_count})`);
        });
      });
      
      console.log('\n' + '─'.repeat(80));
    }
    
    console.log('\n✅ 恢复完成！\n');
    
    await connection.end();
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    if (error.code) {
      console.error(`   错误代码: ${error.code}`);
    }
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

restoreCategories();


