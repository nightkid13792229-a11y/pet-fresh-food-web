import { query } from '../src/db/pool.js';
import logger from '../src/utils/logger.js';
import { validateEnv } from '../src/config/env-validator.js';

// 旧分类到新分类体系的映射（根据《中国食物成分表》）
const CATEGORY_MAPPING = {
  '种子': '坚果、种子类',
  '鱼肉': '鱼虾蟹贝类',
  '营养品': '蛋白质类', // 营养品映射到营养补充剂下的蛋白质类
  '香料': '调味品类',
  '水果': '水果类及制品',
  '蔬菜': '蔬菜类及制品',
  '谷物': '谷类及制品',
  '禽肉': '禽肉类及制品',
  '内脏': '畜肉类及制品', // 内脏属于畜肉类
  '菌菇': '蔬菜类及制品', // 菌菇属于蔬菜类
  '坚果': '坚果、种子类',
  '蛋类': '蛋类及制品',
  '畜肉': '畜肉类及制品',
  '贝类': '鱼虾蟹贝类',
  '包装': '包装容器类' // 包装映射到包材下的包装容器类
};

async function importItemsFromIngredients() {
  try {
    validateEnv();

    await query('SELECT 1');
    logger.info('数据库连接成功');

    // 1. 获取所有唯一的分类和项目组合
    logger.info('正在从ingredients表中提取唯一的分类和项目组合...');
    
    // 先检查数据
    const checkData = await query('SELECT COUNT(*) as total FROM ingredients');
    logger.info(`ingredients表中共有 ${checkData[0]?.total || 0} 条记录`);
    
    // 获取所有数据，包括classification为NULL的
    const allIngredients = await query(`
      SELECT DISTINCT 
        COALESCE(classification, '') as classification,
        category,
        name
      FROM ingredients
      WHERE category IS NOT NULL 
        AND category != ''
        AND name IS NOT NULL 
        AND name != ''
      ORDER BY category, name
    `);

    if (allIngredients.length === 0) {
      logger.warn('ingredients表中没有有效的分类和项目数据');
      process.exit(0);
    }

    logger.info(`找到 ${allIngredients.length} 个唯一的分类-项目组合`);

    // 2. 处理数据：将旧分类映射到新分类体系
    const processedData = [];
    for (const item of allIngredients) {
      let classification = item.classification || '';
      let category = item.category;
      
      // 如果classification为空，尝试从category映射
      if (!classification || classification === '') {
        // 检查category是否在映射表中
        if (CATEGORY_MAPPING[category]) {
          const mappedCategory = CATEGORY_MAPPING[category];
          // 判断是食材、营养补充剂还是包材
          if (category === '营养品') {
            classification = '营养补充剂';
            category = mappedCategory; // 使用映射后的category（如：蛋白质类）
            logger.info(`映射: 营养品 -> ${classification}|${category}`);
          } else if (category === '包装') {
            classification = '包材';
            category = mappedCategory; // 使用映射后的category（如：包装容器类）
          } else {
            classification = '食材';
            category = mappedCategory; // 使用映射后的category
          }
        } else {
          // 默认归类为食材
          classification = '食材';
          // category保持不变，尝试直接匹配
        }
      } else {
        // 如果classification不为空，但category可能需要映射
        if (CATEGORY_MAPPING[category] && classification === '食材') {
          category = CATEGORY_MAPPING[category];
        }
      }
      
      processedData.push({
        classification: classification,
        category: category,
        name: item.name
      });
    }

    logger.info(`处理后的数据: ${processedData.length} 条`);

    // 3. 获取所有分类的ID映射
    const categories = await query('SELECT id, classification, category FROM ingredient_categories');
    const categoryMap = {};
    categories.forEach(cat => {
      const key = `${cat.classification}|${cat.category}`;
      categoryMap[key] = cat.id;
    });

    logger.info(`找到 ${categories.length} 个分类`);

    // 4. 按分类分组统计
    const classificationStats = {};
    processedData.forEach(item => {
      if (!classificationStats[item.classification]) {
        classificationStats[item.classification] = {};
      }
      if (!classificationStats[item.classification][item.category]) {
        classificationStats[item.classification][item.category] = [];
      }
      classificationStats[item.classification][item.category].push(item.name);
    });

    // 5. 导入项目数据
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors = [];
    const categoryNotFound = {};

    for (const item of processedData) {
      const key = `${item.classification}|${item.category}`;
      const categoryId = categoryMap[key];

      if (!categoryId) {
        // 记录找不到的分类
        if (!categoryNotFound[key]) {
          categoryNotFound[key] = [];
        }
        categoryNotFound[key].push(item.name);
        skipCount++;
        continue;
      }

      try {
        // 检查项目是否已存在
        const existing = await query(
          'SELECT id FROM ingredient_items WHERE category_id = ? AND name = ?',
          [categoryId, item.name]
        );

        if (existing && existing.length > 0) {
          skipCount++;
          continue;
        }

        // 获取当前分类的最大display_order
        const maxOrderResult = await query(
          'SELECT MAX(display_order) as maxOrder FROM ingredient_items WHERE category_id = ?',
          [categoryId]
        );
        const maxOrder = maxOrderResult[0]?.maxOrder || 0;

        // 插入项目
        await query(
          `INSERT INTO ingredient_items (category_id, name, display_order, created_at, updated_at)
           VALUES (?, ?, ?, NOW(), NOW())`,
          [categoryId, item.name, maxOrder + 1]
        );

        successCount++;
        if (successCount % 10 === 0) {
          logger.info(`已处理 ${successCount} 条...`);
        }
      } catch (error) {
        errorCount++;
        const errorMsg = error.message || '未知错误';
        errors.push(`分类: ${item.category}, 项目: ${item.name} - ${errorMsg}`);
        logger.error(`导入失败：${item.category} -> ${item.name}`, errorMsg);
      }
    }

    // 6. 输出统计信息
    console.log('\n=== 导入完成 ===');
    console.log(`成功：${successCount} 条`);
    console.log(`跳过：${skipCount} 条（已存在或找不到分类）`);
    console.log(`失败：${errorCount} 条`);
    console.log(`总计：${processedData.length} 条\n`);

    // 按分类统计
    console.log('=== 按分类统计 ===');
    for (const [classification, categories] of Object.entries(classificationStats)) {
      console.log(`\n${classification}:`);
      for (const [category, items] of Object.entries(categories)) {
        const uniqueItems = [...new Set(items)];
        console.log(`  ${category}: ${uniqueItems.length} 个项目`);
      }
    }

    // 显示找不到的分类
    if (Object.keys(categoryNotFound).length > 0) {
      console.log('\n=== 找不到的分类（需要先导入预设分类） ===');
      for (const [key, items] of Object.entries(categoryNotFound)) {
        const [classification, category] = key.split('|');
        const uniqueItems = [...new Set(items)];
        console.log(`  ${classification} -> ${category}: ${uniqueItems.length} 个项目未导入`);
      }
    }

    if (errors.length > 0 && errors.length <= 20) {
      console.log('\n=== 错误详情 ===');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    process.exit(0);
  } catch (error) {
    logger.error('导入失败:', error);
    process.exit(1);
  }
}

importItemsFromIngredients().catch(console.error);
