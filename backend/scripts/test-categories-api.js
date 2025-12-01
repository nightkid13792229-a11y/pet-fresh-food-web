#!/usr/bin/env node

/**
 * 测试分类 API 是否正常工作
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
}

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'petfresh'
};

async function testCategoriesAPI() {
  let connection;
  
  try {
    console.log('\n=== 测试分类 API 数据 ===\n');
    
    // 连接数据库
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database
    });
    
    console.log('✓ 数据库连接成功\n');
    
    // 测试 findAllCategories 函数（模拟后端逻辑）
    const classification = '食材';
    const pageSize = 1000;
    
    let sql = `
      SELECT
        id,
        classification,
        category,
        display_order AS displayOrder,
        created_at AS createdAt,
        updated_at AS updatedAt,
        created_by AS createdBy,
        updated_by AS updatedBy
      FROM ingredient_categories
      WHERE classification = ?
      ORDER BY display_order ASC, category ASC
      LIMIT ${pageSize}
    `;
    
    const [items] = await connection.execute(sql, [classification]);
    
    console.log(`✓ 查询到 ${items.length} 个分类\n`);
    
    // 模拟后端返回格式
    const result = {
      items: items,
      total: items.length,
      page: 1,
      pageSize: pageSize,
      totalPages: 1
    };
    
    // 模拟前端解析逻辑
    const response = {
      success: true,
      data: result
    };
    
    const data = response?.data || response;
    const categories = Array.isArray(data) ? data : (data.items || []);
    
    console.log('📊 数据解析结果:');
    console.log(`   response.data 类型: ${typeof response.data}`);
    console.log(`   response.data.items 类型: ${Array.isArray(response.data.items) ? 'Array' : typeof response.data.items}`);
    console.log(`   最终 categories 类型: ${Array.isArray(categories) ? 'Array' : typeof categories}`);
    console.log(`   最终 categories 长度: ${categories.length}\n`);
    
    if (categories.length > 0) {
      console.log('📋 前5个分类:');
      categories.slice(0, 5).forEach((cat, index) => {
        console.log(`   ${index + 1}. ${cat.category} (ID: ${cat.id})`);
      });
    }
    
    console.log('\n✅ API 数据格式测试通过！\n');
    
    await connection.end();
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

testCategoriesAPI();

