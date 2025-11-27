#!/usr/bin/env node

/**
 * 执行数据库迁移脚本
 * 用法: node scripts/run-migration.js <migration-file.sql>
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import mysql from 'mysql2/promise';

// 加载环境变量
const scriptDir = dirname(fileURLToPath(import.meta.url));
const envPath = join(scriptDir, '..', '.env');
if (existsSync(envPath)) {
  config({ path: envPath });
  console.log(`已加载环境变量文件: ${envPath}`);
} else {
  console.warn(`警告: 未找到 .env 文件: ${envPath}`);
  console.warn('将尝试使用系统环境变量');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('错误: 请指定迁移文件路径');
    console.log('用法: node scripts/run-migration.js <migration-file.sql>');
    process.exit(1);
  }

  const migrationPath = join(__dirname, '..', migrationFile);
  
  // 检查环境变量或命令行参数
  const dbConfig = {
    host: process.env.DB_HOST || process.argv[3],
    port: Number(process.env.DB_PORT || process.argv[4] || 3306),
    user: process.env.DB_USER || process.argv[5],
    password: process.env.DB_PASSWORD || process.argv[6],
    database: process.env.DB_NAME || process.argv[7]
  };
  
  if (!dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
    console.error('错误: 缺少必要的数据库配置');
    console.log('\n请使用以下方式之一提供数据库配置:');
    console.log('1. 创建 .env 文件（推荐）');
    console.log('2. 使用命令行参数:');
    console.log('   node scripts/run-migration.js <migration-file> <host> <port> <user> <password> <database>');
    console.log('\n示例:');
    console.log('   node scripts/run-migration.js sql/add_new_ingredient_fields.sql 127.0.0.1 3306 root password petfresh');
    process.exit(1);
  }
  
  try {
    // 读取 SQL 文件
    console.log(`读取迁移文件: ${migrationPath}`);
    const sql = readFileSync(migrationPath, 'utf-8');
    
    // 分割 SQL 语句（按分号，但保留注释）
    // 移除单行注释（-- 开头的行），但保留多行注释中的内容
    const lines = sql.split('\n');
    const cleanedLines = lines
      .map(line => {
        // 移除行尾注释
        const commentIndex = line.indexOf('--');
        if (commentIndex >= 0) {
          // 检查是否在字符串中
          const beforeComment = line.substring(0, commentIndex);
          const quoteCount = (beforeComment.match(/'/g) || []).length;
          if (quoteCount % 2 === 0) {
            // 不在字符串中，移除注释
            return line.substring(0, commentIndex).trim();
          }
        }
        return line.trim();
      })
      .filter(line => line.length > 0);
    
    const fullSql = cleanedLines.join('\n');
    
    // 按分号分割语句
    const statements = fullSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.toUpperCase().includes('ALTER'));
    
    if (statements.length === 0) {
      console.error('错误: 迁移文件中没有有效的 SQL 语句');
      process.exit(1);
    }
    
    console.log(`找到 ${statements.length} 条 SQL 语句`);
    
    // 创建数据库连接
    console.log('连接数据库...');
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      multipleStatements: true // 允许执行多条语句
    });
    
    console.log('数据库连接成功');
    console.log(`数据库: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    
    // 执行每条 SQL 语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim().length === 0) continue;
      
      console.log(`\n执行语句 ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        await connection.execute(statement);
        console.log('✓ 执行成功');
      } catch (error) {
        // 如果字段已存在，忽略错误
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('⚠ 字段已存在，跳过');
        } else {
          console.error('✗ 执行失败:', error.message);
          throw error;
        }
      }
    }
    
    // 验证字段是否添加成功
    console.log('\n验证迁移结果...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ingredients'
      AND COLUMN_NAME IN ('subject', 'part', 'origin_type', 'model', 'unit_content')
      ORDER BY COLUMN_NAME
    `, [dbConfig.database]);
    
    console.log('\n已添加的字段:');
    if (columns.length === 0) {
      console.log('  未找到新字段');
    } else {
      columns.forEach(col => {
        console.log(`  ✓ ${col.COLUMN_NAME} (${col.COLUMN_TYPE}) - ${col.COLUMN_COMMENT || ''}`);
      });
    }
    
    const expectedFields = ['subject', 'part', 'origin_type', 'model', 'unit_content'];
    const addedFields = columns.map(col => col.COLUMN_NAME);
    const missingFields = expectedFields.filter(field => !addedFields.includes(field));
    
    if (missingFields.length > 0) {
      console.log('\n⚠ 以下字段未找到:', missingFields.join(', '));
    } else {
      console.log('\n✓ 所有字段已成功添加！');
    }
    
    await connection.end();
    console.log('\n迁移完成！');
    
  } catch (error) {
    console.error('\n迁移失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration().catch(error => {
  console.error('未处理的错误:', error);
  process.exit(1);
});

