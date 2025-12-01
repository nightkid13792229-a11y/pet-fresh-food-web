/**
 * 从 Excel 文件导入原料数据到数据库
 * 
 * 使用方法：
 * 1. 将 Excel 文件放在项目根目录（与 backend 目录同级）
 * 2. 在项目根目录执行：node backend/scripts/import-ingredients-from-excel.js
 * 
 * 或者指定文件路径：
 * node backend/scripts/import-ingredients-from-excel.js 原材料信息.xlsx
 */

import { readFile } from 'fs/promises';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { query } from '../src/db/pool.js';
import logger from '../src/utils/logger.js';
import { validateEnv } from '../src/config/env-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 获取 Excel 文件路径
const excelFileName = process.argv[2] || '原材料信息.xlsx';
// 从脚本目录向上两级到项目根目录
const projectRoot = resolve(__dirname, '../..');
const excelFilePath = join(projectRoot, excelFileName);

async function importIngredientsFromExcel() {
  try {
    validateEnv();
    
    // 测试数据库连接
    await query('SELECT 1');
    logger.info('数据库连接成功');

    // 读取 Excel 文件
    logger.info(`读取 Excel 文件: ${excelFilePath}`);
    const fileBuffer = await readFile(excelFilePath);
    
    // 解析 Excel
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // 获取第一个工作表
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // 转换为JSON（第一行作为表头）
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, // 使用数组格式，第一行是表头
      defval: null // 空单元格返回null
    });
    
    if (jsonData.length < 2) {
      logger.error('Excel文件数据为空或格式不正确');
      process.exit(1);
    }
    
    logger.info(`Excel数据行数: ${jsonData.length}`);
    logger.info(`表头: ${jsonData[0].join(', ')}`);
    
    // 解析表头，找到对应的列索引
    const headers = jsonData[0].map(h => String(h || '').trim().toLowerCase());
    const headerMap = {};
    
    // 常见的中文表头映射
    const headerMappings = {
      '编号': 'code',
      'code': 'code',
      '类别': 'category',
      'category': 'category',
      '项目': 'name',
      '名称': 'name',
      'name': 'name',
      '品牌': 'brand',
      '来源': 'brand',
      'brand': 'brand',
      '费用': 'cost',
      '采购价格': 'cost',
      '价格': 'cost',
      'cost': 'cost',
      '单量': 'quantity',
      '采购数量': 'quantity',
      '数量': 'quantity',
      'quantity': 'quantity',
      '单位': 'unit',
      'unit': 'unit',
      '单价/500单位': 'pricePer500',
      '单价': 'pricePer500',
      'priceper500': 'pricePer500',
      '可食部': 'ediblePortion',
      '可食部%': 'ediblePortion',
      'edibleportion': 'ediblePortion',
      '可食部单价/500单位': 'ediblePricePer500',
      'ediblepriceper500': 'ediblePricePer500',
      '每单位重量': 'weightPerUnit',
      'weightperunit': 'weightPerUnit',
      '说明': 'description',
      '描述': 'description',
      'description': 'description',
      '主要作用': 'mainFunction',
      'mainfunction': 'mainFunction'
    };
    
    headers.forEach((header, index) => {
      const normalized = header.toLowerCase();
      for (const [chinese, english] of Object.entries(headerMappings)) {
        if (normalized.includes(chinese.toLowerCase()) || normalized === english.toLowerCase()) {
          headerMap[english] = index;
          break;
        }
      }
    });
    
    logger.info('表头映射:', JSON.stringify(headerMap, null, 2));
    
    // 检查必需字段
    if (headerMap.category === undefined || headerMap.name === undefined) {
      logger.error(`Excel文件缺少必需字段（类别、项目/名称）。\n找到的表头：${headers.join(', ')}`);
      process.exit(1);
    }
    
    // 转换数据
    const ingredients = [];
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;
      
      const category = row[headerMap.category] ? String(row[headerMap.category]).trim() : '';
      const name = row[headerMap.name] ? String(row[headerMap.name]).trim() : '';
      
      // 跳过空行
      if (!category && !name) continue;
      
      // 解析数值字段
      const parseNumber = (val) => {
        if (val == null || val === '') return null;
        const num = typeof val === 'number' ? val : parseFloat(String(val));
        return isNaN(num) ? null : num;
      };
      
      // 解析可食部（可能是百分比或小数）
      let ediblePortion = 1.0;
      if (headerMap.ediblePortion !== undefined) {
        const val = row[headerMap.ediblePortion];
        if (val != null && val !== '') {
          const num = parseNumber(val);
          if (num != null) {
            // 如果大于1，认为是百分比，转换为小数
            ediblePortion = num > 1 ? num / 100 : num;
            ediblePortion = Math.max(0, Math.min(1, ediblePortion)); // 限制在0-1之间
          }
        }
      }
      
      const ingredient = {
        code: headerMap.code !== undefined ? String(row[headerMap.code] || '').trim() : '',
        category: category,
        name: name,
        brand: headerMap.brand !== undefined ? String(row[headerMap.brand] || '').trim() || null : null,
        cost: headerMap.cost !== undefined ? parseNumber(row[headerMap.cost]) : null,
        quantity: headerMap.quantity !== undefined ? parseNumber(row[headerMap.quantity]) : null,
        unit: headerMap.unit !== undefined ? String(row[headerMap.unit] || 'g').trim() : 'g',
        pricePer500: headerMap.pricePer500 !== undefined ? parseNumber(row[headerMap.pricePer500]) : null,
        ediblePortion: ediblePortion,
        ediblePricePer500: headerMap.ediblePricePer500 !== undefined ? parseNumber(row[headerMap.ediblePricePer500]) : null,
        weightPerUnit: headerMap.weightPerUnit !== undefined ? parseNumber(row[headerMap.weightPerUnit]) : null,
        classification: null, // 预留字段
        description: headerMap.description !== undefined ? String(row[headerMap.description] || '').trim() || null : null,
        mainFunction: headerMap.mainFunction !== undefined ? String(row[headerMap.mainFunction] || '').trim() || null : null
      };
      
      ingredients.push(ingredient);
    }
    
    if (ingredients.length === 0) {
      logger.error('Excel文件中没有有效的原料数据');
      process.exit(1);
    }
    
    logger.info(`从Excel文件解析到 ${ingredients.length} 条原料数据，开始导入...`);
    
    // 批量导入
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < ingredients.length; i++) {
      const ing = ingredients[i];
      
      // 跳过没有类别或名称的数据
      if (!ing.category || !ing.name) {
        skipCount++;
        logger.warn(`跳过第 ${i + 1} 条数据：缺少类别或名称`);
        continue;
      }
      
      try {
        // 检查编号是否已存在
        if (ing.code) {
          const existing = await query('SELECT id FROM ingredients WHERE code = ?', [ing.code]);
          if (existing && existing.length > 0) {
            logger.warn(`跳过：编号 ${ing.code} 已存在 - ${ing.name}`);
            skipCount++;
            continue;
          }
        }
        
        // 插入数据
        const sql = `
          INSERT INTO ingredients (
            code, category, name, brand, cost, quantity, unit,
            price_per_500, edible_portion, edible_price_per_500, weight_per_unit,
            classification, description, main_function,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        
        const params = [
          ing.code || '',
          ing.category,
          ing.name,
          ing.brand,
          ing.cost,
          ing.quantity,
          ing.unit,
          ing.pricePer500,
          ing.ediblePortion,
          ing.ediblePricePer500,
          ing.weightPerUnit,
          ing.classification,
          ing.description,
          ing.mainFunction
        ];
        
        await query(sql, params);
        successCount++;
        
        if ((i + 1) % 10 === 0) {
          logger.info(`已处理 ${i + 1}/${ingredients.length} 条...`);
        }
      } catch (error) {
        errorCount++;
        logger.error(`导入失败：${ing.code || '无编号'} - ${ing.name}`, error.message);
      }
    }
    
    console.log('\n=== 导入完成 ===');
    console.log(`成功：${successCount} 条`);
    console.log(`跳过：${skipCount} 条（缺少类别/名称或已存在）`);
    console.log(`失败：${errorCount} 条`);
    console.log(`总计：${ingredients.length} 条\n`);
    
    process.exit(0);
  } catch (error) {
    logger.error('导入失败:', error);
    process.exit(1);
  }
}

importIngredientsFromExcel().catch(console.error);




