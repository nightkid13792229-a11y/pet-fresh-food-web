import { query, transaction } from '../../db/pool.js';
import logger from '../../utils/logger.js';

const baseSelect = `
  SELECT
    r.id,
    r.code,
    r.name,
    r.description,
    r.life_stage AS lifeStage,
    r.recipe_type AS recipeType,
    r.software,
    r.nutrition_standard AS nutritionStandard,
    r.cooking_loss AS cookingLoss,
    r.selling_price AS sellingPrice,
    r.protein,
    r.fat,
    r.carb,
    r.fiber,
    r.ash,
    r.moisture,
    r.ca_ratio AS caRatio,
    r.total_kcal AS totalKcal,
    r.total_weight AS totalWeight,
    r.kcal_density AS kcalDensity,
    r.base_price AS basePrice,
    r.default_servings AS defaultServings,
    r.created_at AS createdAt,
    r.updated_at AS updatedAt,
    r.created_by AS createdBy,
    r.updated_by AS updatedBy
  FROM recipes r
`;

export const listRecipes = async (options = {}) => {
  const { search, lifeStage, recipeType, page = 1, pageSize = 20 } = options;
  let sql = baseSelect;
  const countSql = 'SELECT COUNT(*) as total FROM recipes';
  const params = [];
  const conditions = [];

  if (search && search.trim()) {
    conditions.push('(r.name LIKE ? OR r.code LIKE ? OR r.description LIKE ?)');
    const searchPattern = `%${search.trim()}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (lifeStage && lifeStage.trim()) {
    conditions.push('r.life_stage = ?');
    params.push(lifeStage.trim());
  }

  if (recipeType && recipeType.trim()) {
    conditions.push('r.recipe_type = ?');
    params.push(recipeType.trim());
  }

  const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

  // 获取总数
  const countResult = await query(countSql + whereClause, params);
  const total = countResult[0]?.total || 0;

  // 获取分页数据
  sql += whereClause;
  sql += ' ORDER BY r.updated_at DESC, r.created_at DESC';

  if (pageSize > 0) {
    const offset = (page - 1) * pageSize;
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;
  }

  const items = await query(sql, params);
  logger.info(`[listRecipes] 查询到 ${items.length} 条食谱记录`);
  logger.info(`[listRecipes] 开始处理 ${items.length} 条食谱记录`);

  // 为每个食谱加载关联的食材数据
  for (let i = 0; i < items.length; i++) {
    logger.info(`[listRecipes] 处理第 ${i + 1}/${items.length} 条食谱记录`);
    // 将 RowDataPacket 转换为纯 JavaScript 对象，避免序列化问题
    const recipeRow = items[i];
    logger.info(`[listRecipes] 原始 recipeRow 类型: ${typeof recipeRow}, keys: ${Object.keys(recipeRow).join(', ')}`);
    const recipe = JSON.parse(JSON.stringify(recipeRow));
    items[i] = recipe; // 替换原对象
    logger.info(`[listRecipes] 转换后 recipe 类型: ${typeof recipe}, keys: ${Object.keys(recipe).join(', ')}`);
    
    // 初始化，确保始终有值
    recipe.ingredients = [];
    recipe.cookingSteps = [];
    logger.info(`[listRecipes] 初始化后 recipe.ingredients: ${JSON.stringify(recipe.ingredients)}`);
    
    try {
      logger.info(`[listRecipes] 开始加载食谱 ${recipe.id} (${recipe.name}) 的关联数据`);
      logger.info(`[listRecipes] 当前 recipe 对象键:`, Object.keys(recipe).join(', '));
      
      // 尝试查询 weight 字段，如果不存在则查询 default_amount 字段（兼容旧表结构）
      let ingredients = [];
      try {
        logger.info(`[listRecipes] 准备查询食谱 ${recipe.id} 的食材记录（使用 weight 字段）`);
        ingredients = await query(`
          SELECT 
            ri.id,
            ri.ingredient_name AS ingredientName,
            ri.weight,
            ri.unit
          FROM recipe_ingredients ri
          WHERE ri.recipe_id = ?
          ORDER BY ri.id ASC
        `, [recipe.id]);
        logger.info(`[listRecipes] 食谱 ${recipe.id} 查询到 ${ingredients.length} 条食材记录（使用 weight 字段）`);
        if (ingredients.length > 0) {
          logger.info(`[listRecipes] 查询结果:`, JSON.stringify(ingredients, null, 2));
          logger.debug(`[listRecipes] 第一条食材记录:`, JSON.stringify(ingredients[0], null, 2));
        }
      } catch (error) {
        logger.error(`[listRecipes] 查询食材记录失败:`, error);
        logger.error(`[listRecipes] 错误代码: ${error.code}, 错误信息: ${error.message}`);
        logger.error(`[listRecipes] 错误堆栈:`, error.stack);
        // 如果 weight 字段不存在，尝试使用 default_amount 字段
        if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('weight')) {
          logger.info(`[listRecipes] weight 字段不存在，使用 default_amount 字段查询`);
          try {
            ingredients = await query(`
              SELECT 
                ri.id,
                ri.ingredient_name AS ingredientName,
                ri.default_amount AS weight,
                ri.unit
              FROM recipe_ingredients ri
              WHERE ri.recipe_id = ?
              ORDER BY ri.id ASC
            `, [recipe.id]);
            logger.info(`[listRecipes] 食谱 ${recipe.id} 查询到 ${ingredients.length} 条食材记录（使用 default_amount 字段）`);
            if (ingredients.length > 0) {
              logger.info(`[listRecipes] 查询结果:`, JSON.stringify(ingredients, null, 2));
            }
          } catch (error2) {
            logger.error(`[listRecipes] 使用 default_amount 字段查询也失败:`, error2);
            logger.error(`[listRecipes] 错误堆栈:`, error2.stack);
            ingredients = [];
          }
        } else {
          logger.error(`[listRecipes] 无法查询食材记录，错误代码: ${error.code}, 错误信息: ${error.message}`);
          ingredients = [];
        }
      }
      
      // 确保 ingredients 是数组
      if (!Array.isArray(ingredients)) {
        logger.warn(`[listRecipes] ingredients 不是数组，重置为空数组。实际类型: ${typeof ingredients}, 值:`, ingredients);
        ingredients = [];
      }
      
      logger.info(`[listRecipes] 准备映射 ingredients，数量: ${ingredients.length}`);
      // 先将 RowDataPacket 对象转换为纯 JavaScript 对象
      const plainIngredients = ingredients.map(ing => JSON.parse(JSON.stringify(ing)));
      logger.info(`[listRecipes] 转换后的 ingredients 示例:`, plainIngredients.length > 0 ? JSON.stringify(plainIngredients[0]) : 'N/A');
      recipe.ingredients = plainIngredients.map(ing => {
        if (!ing) {
          logger.warn(`[listRecipes] 发现 null 或 undefined 的 ing 项`);
          return null;
        }
        const plainIng = {
          id: ing.id,
          ingredientName: ing.ingredientName || '',
          weight: ing.weight,
          unit: ing.unit || 'g'
        };
        logger.debug(`[listRecipes] 映射后的 ingredient:`, JSON.stringify(plainIng));
        return plainIng;
      }).filter(ing => ing !== null);
      
      logger.info(`[listRecipes] 食谱 ${recipe.id} 最终 ingredients 数量: ${recipe.ingredients.length}`);
      if (recipe.ingredients.length > 0) {
        logger.info(`[listRecipes] 最终 ingredients 内容:`, JSON.stringify(recipe.ingredients, null, 2));
      }

      // 加载制作步骤
      let steps = [];
      try {
        steps = await query(`
          SELECT id, step_order AS stepOrder, description
          FROM recipe_cooking_steps
          WHERE recipe_id = ?
          ORDER BY step_order ASC
        `, [recipe.id]);
        // 将 RowDataPacket 对象转换为纯 JavaScript 对象
        steps = steps.map(step => JSON.parse(JSON.stringify(step)));
      } catch (error) {
        logger.error(`[listRecipes] 查询制作步骤失败:`, error);
        steps = [];
      }
      
      recipe.cookingSteps = (Array.isArray(steps) ? steps : []).map(step => ({
        id: step.id,
        stepOrder: step.stepOrder,
        description: step.description
      }));
      
      logger.info(`[listRecipes] 食谱 ${recipe.id} 最终 cookingSteps 数量: ${recipe.cookingSteps.length}`);
    } catch (error) {
      logger.error(`[listRecipes] 加载食谱 ${recipe.id} (${recipe.name}) 的关联数据失败:`, error);
      logger.error(`[listRecipes] 错误堆栈:`, error.stack);
      // 确保即使出错也有默认值
      recipe.ingredients = recipe.ingredients || [];
      recipe.cookingSteps = recipe.cookingSteps || [];
    }
    
    // 最终验证：确保 ingredients 和 cookingSteps 都存在
    if (!recipe.ingredients) {
      logger.warn(`[listRecipes] 食谱 ${recipe.id} ingredients 为 undefined，设置为空数组`);
      recipe.ingredients = [];
    }
    if (!recipe.cookingSteps) {
      logger.warn(`[listRecipes] 食谱 ${recipe.id} cookingSteps 为 undefined，设置为空数组`);
      recipe.cookingSteps = [];
    }
    
    // 最终验证：确保 ingredients 是数组
    if (!Array.isArray(recipe.ingredients)) {
      logger.error(`[listRecipes] 食谱 ${recipe.id} ingredients 不是数组！类型: ${typeof recipe.ingredients}, 值:`, recipe.ingredients);
      recipe.ingredients = [];
    }
    
    logger.info(`[listRecipes] 食谱 ${recipe.id} 最终验证后 ingredients 数量: ${recipe.ingredients.length}`);
    logger.info(`[listRecipes] 食谱 ${recipe.id} 最终返回数据包含 ingredients: ${'ingredients' in recipe}`);
    if (recipe.ingredients.length > 0) {
      logger.info(`[listRecipes] 食谱 ${recipe.id} ingredients 详细内容:`, JSON.stringify(recipe.ingredients, null, 2));
    }
  }

  // 在返回前，再次验证所有 items 并确保是纯 JavaScript 对象
  logger.info(`[listRecipes] 准备返回 ${items.length} 条食谱记录`);
  logger.info(`[listRecipes] 序列化前，第一个食谱的 keys: ${items.length > 0 ? Object.keys(items[0]).join(', ') : 'N/A'}`);
  logger.info(`[listRecipes] 序列化前，第一个食谱是否有 ingredients: ${items.length > 0 ? ('ingredients' in items[0]) : 'N/A'}`);
  logger.info(`[listRecipes] 序列化前，第一个食谱的 ingredients 值: ${items.length > 0 ? JSON.stringify(items[0].ingredients) : 'N/A'}`);
  
  const serializedItems = items.map(recipe => {
    // 确保 recipe.ingredients 和 recipe.cookingSteps 存在
    const recipeIngredients = recipe.ingredients || [];
    const recipeCookingSteps = recipe.cookingSteps || [];
    
    logger.info(`[listRecipes] 序列化食谱 ${recipe.id}: ingredients 存在=${'ingredients' in recipe}, 类型=${typeof recipe.ingredients}, 是数组=${Array.isArray(recipeIngredients)}, 数量=${recipeIngredients.length}`);
    
    // 手动构建纯 JavaScript 对象，确保所有字段都被包含
    const serializedRecipe = {
      id: recipe.id,
      code: recipe.code,
      name: recipe.name,
      description: recipe.description,
      lifeStage: recipe.lifeStage,
      recipeType: recipe.recipeType,
      software: recipe.software,
      nutritionStandard: recipe.nutritionStandard,
      cookingLoss: recipe.cookingLoss,
      sellingPrice: recipe.sellingPrice,
      protein: recipe.protein,
      fat: recipe.fat,
      carb: recipe.carb,
      fiber: recipe.fiber,
      ash: recipe.ash,
      moisture: recipe.moisture,
      caRatio: recipe.caRatio,
      totalKcal: recipe.totalKcal,
      totalWeight: recipe.totalWeight,
      kcalDensity: recipe.kcalDensity,
      basePrice: recipe.basePrice,
      defaultServings: recipe.defaultServings,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      createdBy: recipe.createdBy,
      updatedBy: recipe.updatedBy,
      // 确保 ingredients 和 cookingSteps 被明确包含
      ingredients: Array.isArray(recipeIngredients) ? recipeIngredients.map(ing => {
        if (!ing) return null;
        return {
          id: ing.id,
          ingredientName: ing.ingredientName || '',
          weight: ing.weight,
          unit: ing.unit || 'g'
        };
      }).filter(ing => ing !== null) : [],
      cookingSteps: Array.isArray(recipeCookingSteps) ? recipeCookingSteps.map(step => ({
        id: step.id,
        stepOrder: step.stepOrder,
        description: step.description
      })) : []
    };
    
    logger.info(`[listRecipes] 手动构建后，食谱 ${serializedRecipe.id} 的 keys: ${Object.keys(serializedRecipe).join(', ')}`);
    logger.info(`[listRecipes] 手动构建后，食谱 ${serializedRecipe.id} 是否有 ingredients: ${'ingredients' in serializedRecipe}`);
    logger.info(`[listRecipes] 手动构建后，食谱 ${serializedRecipe.id} 的 ingredients 值: ${JSON.stringify(serializedRecipe.ingredients)}`);
    
    if (!serializedRecipe.ingredients) {
      logger.error(`[listRecipes] 返回前发现食谱 ${serializedRecipe.id} ingredients 为 undefined！`);
      serializedRecipe.ingredients = [];
    }
    if (!Array.isArray(serializedRecipe.ingredients)) {
      logger.error(`[listRecipes] 返回前发现食谱 ${serializedRecipe.id} ingredients 不是数组！`);
      serializedRecipe.ingredients = [];
    }
    
    logger.info(`[listRecipes] 食谱 ${serializedRecipe.id} (${serializedRecipe.name}) 返回数据检查:`, JSON.stringify({
      id: serializedRecipe.id,
      name: serializedRecipe.name,
      hasIngredients: 'ingredients' in serializedRecipe,
      ingredientsCount: serializedRecipe.ingredients ? serializedRecipe.ingredients.length : 'N/A',
      ingredientsType: typeof serializedRecipe.ingredients,
      ingredientsIsArray: Array.isArray(serializedRecipe.ingredients),
      firstIngredient: serializedRecipe.ingredients && serializedRecipe.ingredients.length > 0 ? serializedRecipe.ingredients[0] : null
    }));
    
    return serializedRecipe;
  });

  return {
    items: serializedItems,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
};

export const getRecipeById = async (id) => {
  const rows = await query(`${baseSelect} WHERE r.id = ? LIMIT 1`, [id]);
  if (!rows[0]) return null;
  
  const recipe = rows[0];
  
  // 加载关联的食材
  // 注意：现在只保存 ingredientName，不保存 ingredientId
  // 尝试查询 weight 字段，如果不存在则查询 default_amount 字段（兼容旧表结构）
  let ingredients;
  try {
    ingredients = await query(`
      SELECT 
        ri.id,
        ri.ingredient_name AS ingredientName,
        ri.weight,
        ri.unit
      FROM recipe_ingredients ri
      WHERE ri.recipe_id = ?
      ORDER BY ri.id ASC
    `, [id]);
    logger.info(`[getRecipeById] 食谱 ${id} 查询到 ${ingredients.length} 条食材记录（使用 weight 字段）`);
    // 将 RowDataPacket 对象转换为纯 JavaScript 对象
    ingredients = ingredients.map(ing => JSON.parse(JSON.stringify(ing)));
    if (ingredients.length > 0) {
      logger.debug(`[getRecipeById] 第一条食材记录:`, JSON.stringify(ingredients[0], null, 2));
    }
  } catch (error) {
    logger.error(`[getRecipeById] 查询食材记录失败:`, error);
    logger.error(`[getRecipeById] 错误代码: ${error.code}, 错误信息: ${error.message}`);
    // 如果 weight 字段不存在，尝试使用 default_amount 字段
    if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('weight')) {
      logger.info(`[getRecipeById] weight 字段不存在，使用 default_amount 字段查询`);
      ingredients = await query(`
        SELECT 
          ri.id,
          ri.ingredient_name AS ingredientName,
          ri.default_amount AS weight,
          ri.unit
        FROM recipe_ingredients ri
        WHERE ri.recipe_id = ?
        ORDER BY ri.id ASC
      `, [id]);
      // 将 RowDataPacket 对象转换为纯 JavaScript 对象
      ingredients = ingredients.map(ing => JSON.parse(JSON.stringify(ing)));
      logger.info(`[getRecipeById] 食谱 ${id} 查询到 ${ingredients.length} 条食材记录（使用 default_amount 字段）`);
    } else {
      logger.error(`[getRecipeById] 无法查询食材记录，错误代码: ${error.code}, 错误信息: ${error.message}`);
      throw error;
    }
  }
  
  recipe.ingredients = ingredients.map(ing => ({
    id: ing.id,
    ingredientName: ing.ingredientName || '',
    weight: ing.weight,
    unit: ing.unit || 'g'
  }));
  
  // 加载制作步骤
  let steps = await query(`
    SELECT id, step_order AS stepOrder, description
    FROM recipe_cooking_steps
    WHERE recipe_id = ?
    ORDER BY step_order ASC
  `, [id]);
  // 将 RowDataPacket 对象转换为纯 JavaScript 对象
  steps = steps.map(step => JSON.parse(JSON.stringify(step)));
  
  recipe.cookingSteps = steps.map(step => ({
    id: step.id,
    stepOrder: step.stepOrder,
    description: step.description
  }));
  
  return recipe;
};

export const findRecipeByCode = async (code) => {
  const rows = await query(`${baseSelect} WHERE r.code = ? LIMIT 1`, [code]);
  return rows[0] || null;
};

export const createRecipe = async (payload, userId) => {
  return await transaction(async (conn) => {
    // 插入主表
    const recipeSql = `
      INSERT INTO recipes (
        code, name, description, life_stage, recipe_type, software, nutrition_standard,
        cooking_loss, selling_price, protein, fat, carb, fiber, ash, moisture,
        ca_ratio, total_kcal, total_weight, kcal_density, base_price, default_servings,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const recipeParams = [
      payload.code || null,
      payload.name,
      payload.description || null,
      payload.lifeStage || null,
      payload.recipeType || 'standard',
      payload.software || 'ADF',
      payload.nutritionStandard || 'FEDIAF',
      payload.cookingLoss !== undefined ? payload.cookingLoss : 7.00,
      payload.sellingPrice || null,
      payload.protein || null,
      payload.fat || null,
      payload.carb || null,
      payload.fiber || null,
      payload.ash || null,
      payload.moisture || null,
      payload.caRatio || null,
      payload.totalKcal || null,
      payload.totalWeight || null,
      payload.kcalDensity || null,
      payload.basePrice || null,
      payload.defaultServings || null,
      userId || null
    ];
    
    const [recipeResult] = await conn.execute(recipeSql, recipeParams);
    const recipeId = recipeResult.insertId;
    
    // 插入食材关联
    // 注意：现在只保存 ingredientName，不保存 ingredientId
    logger.info(`[createRecipe] 准备保存的食材数据:`, payload.ingredients);
    if (payload.ingredients && Array.isArray(payload.ingredients) && payload.ingredients.length > 0) {
      // 尝试使用 weight 字段，如果失败则使用 default_amount 字段（兼容旧表结构）
      let ingredientSql = `
        INSERT INTO recipe_ingredients (recipe_id, ingredient_name, weight, unit)
        VALUES ?
      `;
      const ingredientValues = payload.ingredients.map(ing => [
        recipeId,
        ing.ingredientName || '',
        ing.weight || null,
        ing.unit || 'g'
      ]);
      logger.info(`[createRecipe] 准备插入 ${ingredientValues.length} 条食材记录到食谱 ${recipeId}`);
      logger.debug(`[createRecipe] 食材数据:`, JSON.stringify(ingredientValues, null, 2));
      try {
        await conn.query(ingredientSql, [ingredientValues]);
        logger.info(`[createRecipe] 成功插入食材记录（使用 weight 字段）`);
      } catch (error) {
        logger.error(`[createRecipe] 插入食材记录失败:`, error);
        logger.error(`[createRecipe] 错误代码: ${error.code}, 错误信息: ${error.message}`);
        logger.error(`[createRecipe] SQL: ${ingredientSql}`);
        // 如果 weight 字段不存在，尝试使用 default_amount 字段
        if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('weight')) {
          logger.info(`[createRecipe] weight 字段不存在，尝试使用 default_amount 字段`);
          ingredientSql = `
            INSERT INTO recipe_ingredients (recipe_id, ingredient_name, default_amount, unit)
            VALUES ?
          `;
          const ingredientValuesAlt = payload.ingredients.map(ing => [
            recipeId,
            ing.ingredientName || '',
            ing.weight || null,
            ing.unit || 'g'
          ]);
          logger.debug(`[createRecipe] 使用 default_amount 字段，数据:`, JSON.stringify(ingredientValuesAlt, null, 2));
          await conn.query(ingredientSql, [ingredientValuesAlt]);
          logger.info(`[createRecipe] 成功插入食材记录（使用 default_amount 字段）`);
        } else {
          // 记录详细错误信息并抛出
          logger.error(`[createRecipe] 无法插入食材记录，错误代码: ${error.code}, 错误信息: ${error.message}`);
          throw error;
        }
      }
    } else {
      logger.info(`[createRecipe] 没有食材数据需要保存`);
    }
    
    // 插入制作步骤
    if (payload.cookingSteps && Array.isArray(payload.cookingSteps) && payload.cookingSteps.length > 0) {
      const stepSql = `
        INSERT INTO recipe_cooking_steps (recipe_id, step_order, description)
        VALUES ?
      `;
      const stepValues = payload.cookingSteps.map((step, index) => [
        recipeId,
        step.stepOrder || (index + 1),
        step.description || ''
      ]);
      await conn.query(stepSql, [stepValues]);
    }
    
    return recipeId;
  });
};

export const updateRecipe = async (id, payload, userId) => {
  return await transaction(async (conn) => {
    // 更新主表
    const fields = [];
    const params = [];
    
    if (payload.code !== undefined) {
      fields.push('code = ?');
      params.push(payload.code || null);
    }
    if (payload.name !== undefined) {
      fields.push('name = ?');
      params.push(payload.name);
    }
    if (payload.description !== undefined) {
      fields.push('description = ?');
      params.push(payload.description || null);
    }
    if (payload.lifeStage !== undefined) {
      fields.push('life_stage = ?');
      params.push(payload.lifeStage || null);
    }
    if (payload.recipeType !== undefined) {
      fields.push('recipe_type = ?');
      params.push(payload.recipeType || 'standard');
    }
    if (payload.software !== undefined) {
      fields.push('software = ?');
      params.push(payload.software || 'ADF');
    }
    if (payload.nutritionStandard !== undefined) {
      fields.push('nutrition_standard = ?');
      params.push(payload.nutritionStandard || 'FEDIAF');
    }
    if (payload.cookingLoss !== undefined) {
      fields.push('cooking_loss = ?');
      params.push(payload.cookingLoss);
    }
    if (payload.sellingPrice !== undefined) {
      fields.push('selling_price = ?');
      params.push(payload.sellingPrice || null);
    }
    if (payload.protein !== undefined) {
      fields.push('protein = ?');
      params.push(payload.protein || null);
    }
    if (payload.fat !== undefined) {
      fields.push('fat = ?');
      params.push(payload.fat || null);
    }
    if (payload.carb !== undefined) {
      fields.push('carb = ?');
      params.push(payload.carb || null);
    }
    if (payload.fiber !== undefined) {
      fields.push('fiber = ?');
      params.push(payload.fiber || null);
    }
    if (payload.ash !== undefined) {
      fields.push('ash = ?');
      params.push(payload.ash || null);
    }
    if (payload.moisture !== undefined) {
      fields.push('moisture = ?');
      params.push(payload.moisture || null);
    }
    if (payload.caRatio !== undefined) {
      fields.push('ca_ratio = ?');
      params.push(payload.caRatio || null);
    }
    if (payload.totalKcal !== undefined) {
      fields.push('total_kcal = ?');
      params.push(payload.totalKcal || null);
    }
    if (payload.totalWeight !== undefined) {
      fields.push('total_weight = ?');
      params.push(payload.totalWeight || null);
    }
    if (payload.kcalDensity !== undefined) {
      fields.push('kcal_density = ?');
      params.push(payload.kcalDensity || null);
    }
    if (payload.basePrice !== undefined) {
      fields.push('base_price = ?');
      params.push(payload.basePrice || null);
    }
    if (payload.defaultServings !== undefined) {
      fields.push('default_servings = ?');
      params.push(payload.defaultServings || null);
    }
    
    if (fields.length > 0) {
      fields.push('updated_by = ?');
      params.push(userId || null);
      params.push(id);
      
      const updateSql = `UPDATE recipes SET ${fields.join(', ')} WHERE id = ?`;
      await conn.execute(updateSql, params);
    }
    
    // 更新食材关联（删除旧的，插入新的）
    if (payload.ingredients !== undefined) {
      await conn.execute('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [id]);
      
      if (Array.isArray(payload.ingredients) && payload.ingredients.length > 0) {
        // 尝试使用 weight 字段，如果失败则使用 default_amount 字段（兼容旧表结构）
        let ingredientSql = `
          INSERT INTO recipe_ingredients (recipe_id, ingredient_name, weight, unit)
          VALUES ?
        `;
        const ingredientValues = payload.ingredients.map(ing => [
          id,
          ing.ingredientName || '',
          ing.weight || null,
          ing.unit || 'g'
        ]);
        logger.info(`[updateRecipe] 准备插入 ${ingredientValues.length} 条食材记录到食谱 ${id}`);
        logger.debug(`[updateRecipe] 食材数据:`, JSON.stringify(ingredientValues, null, 2));
        try {
          await conn.query(ingredientSql, [ingredientValues]);
          logger.info(`[updateRecipe] 成功插入食材记录（使用 weight 字段）`);
        } catch (error) {
          logger.error(`[updateRecipe] 插入食材记录失败:`, error);
          logger.error(`[updateRecipe] 错误代码: ${error.code}, 错误信息: ${error.message}`);
          logger.error(`[updateRecipe] SQL: ${ingredientSql}`);
          // 如果 weight 字段不存在，尝试使用 default_amount 字段
          if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('weight')) {
            logger.info(`[updateRecipe] weight 字段不存在，尝试使用 default_amount 字段`);
            ingredientSql = `
              INSERT INTO recipe_ingredients (recipe_id, ingredient_name, default_amount, unit)
              VALUES ?
            `;
            const ingredientValuesAlt = payload.ingredients.map(ing => [
              id,
              ing.ingredientName || '',
              ing.weight || null,
              ing.unit || 'g'
            ]);
            logger.debug(`[updateRecipe] 使用 default_amount 字段，数据:`, JSON.stringify(ingredientValuesAlt, null, 2));
            await conn.query(ingredientSql, [ingredientValuesAlt]);
            logger.info(`[updateRecipe] 成功插入食材记录（使用 default_amount 字段）`);
          } else {
            // 记录详细错误信息并抛出
            logger.error(`[updateRecipe] 无法插入食材记录，错误代码: ${error.code}, 错误信息: ${error.message}`);
            throw error;
          }
        }
      } else {
        logger.info(`[updateRecipe] 没有食材数据需要保存`);
      }
    }
    
    // 更新制作步骤（删除旧的，插入新的）
    if (payload.cookingSteps !== undefined) {
      await conn.execute('DELETE FROM recipe_cooking_steps WHERE recipe_id = ?', [id]);
      
      if (Array.isArray(payload.cookingSteps) && payload.cookingSteps.length > 0) {
        const stepSql = `
          INSERT INTO recipe_cooking_steps (recipe_id, step_order, description)
          VALUES ?
        `;
        const stepValues = payload.cookingSteps.map((step, index) => [
          id,
          step.stepOrder || (index + 1),
          step.description || ''
        ]);
        await conn.query(stepSql, [stepValues]);
      }
    }
    
    return id;
  });
};

export const deleteRecipe = async (id) => {
  // 由于外键约束设置了 ON DELETE CASCADE，删除食谱会自动删除关联的食材和步骤
  const sql = 'DELETE FROM recipes WHERE id = ?';
  const result = await query(sql, [id]);
  // 对于 DELETE，query 返回的是 ResultSetHeader 对象
  return result.affectedRows > 0;
};




