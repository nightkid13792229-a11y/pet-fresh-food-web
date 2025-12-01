/**
 * 数据迁移脚本：从localStorage导出的JSON数据导入到数据库
 * 
 * 使用方法：
 * 1. 在浏览器控制台执行以下代码导出localStorage数据：
 *    JSON.stringify(JSON.parse(localStorage.getItem('pff-app-v2')).ingredients)
 * 2. 将导出的JSON保存到文件，或直接粘贴到下面的 ingredientsData 变量中
 * 3. 在服务器上执行：node backend/scripts/migrate-ingredients-from-localstorage.js
 */

import { query } from '../src/db/pool.js';
import logger from '../src/utils/logger.js';
import { validateEnv } from '../src/config/env-validator.js';

// 从localStorage导出的原料数据（JSON格式）
// 请将导出的数据粘贴到这里，或从文件读取
const ingredientsData = [
  // 示例格式：
  // {
  //   "id": "id_xxx",
  //   "code": "R001",
  //   "category": "肉类",
  //   "name": "鸡肉",
  //   "brand": "品牌A",
  //   "cost": 50.00,
  //   "quantity": 500,
  //   "unit": "g",
  //   "pricePer500": 50.00,
  //   "ediblePortion": 1.0,
  //   "ediblePricePer500": 50.00,
  //   "weightPerUnit": 1,
  //   "description": "说明",
  //   "mainFunction": "主要作用",
  //   "createdAt": 1234567890,
  //   "updatedAt": 1234567890
  // }
];

async function migrateIngredients() {
  try {
    validateEnv();
    
    // 测试数据库连接
    await query('SELECT 1');
    logger.info('数据库连接成功');

    if (!Array.isArray(ingredientsData) || ingredientsData.length === 0) {
      logger.warn('没有需要迁移的数据，请先设置 ingredientsData 变量');
      console.log('\n请按以下步骤操作：');
      console.log('1. 在浏览器控制台执行：JSON.stringify(JSON.parse(localStorage.getItem("pff-app-v2")).ingredients)');
      console.log('2. 复制导出的JSON数据');
      console.log('3. 将数据粘贴到脚本中的 ingredientsData 变量');
      console.log('4. 重新运行此脚本\n');
      process.exit(0);
    }

    logger.info(`开始迁移 ${ingredientsData.length} 条原料数据...`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const ing of ingredientsData) {
      try {
        // 检查编号是否已存在
        const existing = await query('SELECT id FROM ingredients WHERE code = ?', [ing.code || '']);
        if (existing && existing.length > 0) {
          logger.warn(`跳过：编号 ${ing.code} 已存在`);
          skipCount++;
          continue;
        }

        // 转换数据格式
        const ediblePortion = typeof ing.ediblePortion === 'number' 
          ? ing.ediblePortion 
          : (ing.ediblePortion ? parseFloat(ing.ediblePortion) : 1.0);
        
        // 确保ediblePortion在0-1范围内
        const normalizedEdiblePortion = Math.max(0, Math.min(1, ediblePortion));

        const sql = `
          INSERT INTO ingredients (
            code, category, name, brand, cost, quantity, unit,
            price_per_500, edible_portion, edible_price_per_500, weight_per_unit,
            classification, description, main_function,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?), FROM_UNIXTIME(?))
        `;

        const params = [
          ing.code || '',
          ing.category || '',
          ing.name || '',
          ing.brand || null,
          ing.cost || null,
          ing.quantity || null,
          ing.unit || 'g',
          ing.pricePer500 || null,
          normalizedEdiblePortion,
          ing.ediblePricePer500 || null,
          ing.weightPerUnit || null,
          ing.classification || null, // 预留字段，暂时为空
          ing.description || null,
          ing.mainFunction || null,
          ing.createdAt ? Math.floor(ing.createdAt / 1000) : Math.floor(Date.now() / 1000),
          ing.updatedAt ? Math.floor(ing.updatedAt / 1000) : Math.floor(Date.now() / 1000)
        ];

        await query(sql, params);
        successCount++;
        logger.info(`✓ 已导入：${ing.code || '无编号'} - ${ing.name || '无名称'}`);
      } catch (error) {
        errorCount++;
        logger.error(`✗ 导入失败：${ing.code || '无编号'} - ${ing.name || '无名称'}`, error.message);
      }
    }

    console.log('\n=== 迁移完成 ===');
    console.log(`成功：${successCount} 条`);
    console.log(`跳过：${skipCount} 条（已存在）`);
    console.log(`失败：${errorCount} 条`);
    console.log(`总计：${ingredientsData.length} 条\n`);

    process.exit(0);
  } catch (error) {
    logger.error('迁移失败:', error);
    process.exit(1);
  }
}

migrateIngredients().catch(console.error);





