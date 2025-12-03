import { query, transaction } from '../../db/pool.js';

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
  console.log(`[listRecipes] 查询到 ${items.length} 条食谱记录`);

  // 为每个食谱加载关联的食材数据
  for (const recipe of items) {
    try {
      console.log(`[listRecipes] 开始加载食谱 ${recipe.id} (${recipe.name}) 的关联数据`);
      const ingredients = await query(`
        SELECT 
          ri.id,
          ri.ingredient_name AS ingredientName,
          ri.weight,
          ri.unit
        FROM recipe_ingredients ri
        WHERE ri.recipe_id = ?
        ORDER BY ri.id ASC
      `, [recipe.id]);
      
      console.log(`[listRecipes] 食谱 ${recipe.id} 查询到 ${ingredients.length} 条食材记录`);
      recipe.ingredients = ingredients.map(ing => ({
        id: ing.id,
        ingredientName: ing.ingredientName || '',
        weight: ing.weight,
        unit: ing.unit || 'g'
      }));

      // 加载制作步骤
      const steps = await query(`
        SELECT id, step_order AS stepOrder, description
        FROM recipe_cooking_steps
        WHERE recipe_id = ?
        ORDER BY step_order ASC
      `, [recipe.id]);
      
      recipe.cookingSteps = steps.map(step => ({
        id: step.id,
        stepOrder: step.stepOrder,
        description: step.description
      }));
    } catch (error) {
      console.error(`[listRecipes] 加载食谱 ${recipe.id} (${recipe.name}) 的关联数据失败:`, error);
      // 确保即使出错也有默认值
      recipe.ingredients = [];
      recipe.cookingSteps = [];
    }
  }

  return {
    items,
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
  const ingredients = await query(`
    SELECT 
      ri.id,
      ri.ingredient_name AS ingredientName,
      ri.weight,
      ri.unit
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = ?
    ORDER BY ri.id ASC
  `, [id]);
  
  recipe.ingredients = ingredients.map(ing => ({
    id: ing.id,
    ingredientName: ing.ingredientName || '',
    weight: ing.weight,
    unit: ing.unit || 'g'
  }));
  
  // 加载制作步骤
  const steps = await query(`
    SELECT id, step_order AS stepOrder, description
    FROM recipe_cooking_steps
    WHERE recipe_id = ?
    ORDER BY step_order ASC
  `, [id]);
  
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
    console.log(`[createRecipe] 准备保存的食材数据:`, payload.ingredients);
    if (payload.ingredients && Array.isArray(payload.ingredients) && payload.ingredients.length > 0) {
      const ingredientSql = `
        INSERT INTO recipe_ingredients (recipe_id, ingredient_name, weight, unit)
        VALUES ?
      `;
      const ingredientValues = payload.ingredients.map(ing => [
        recipeId,
        ing.ingredientName || '',
        ing.weight || null,
        ing.unit || 'g'
      ]);
      console.log(`[createRecipe] 准备插入 ${ingredientValues.length} 条食材记录到食谱 ${recipeId}`);
      await conn.query(ingredientSql, [ingredientValues]);
      console.log(`[createRecipe] 成功插入食材记录`);
    } else {
      console.log(`[createRecipe] 没有食材数据需要保存`);
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
        const ingredientSql = `
          INSERT INTO recipe_ingredients (recipe_id, ingredient_name, weight, unit)
          VALUES ?
        `;
        const ingredientValues = payload.ingredients.map(ing => [
          id,
          ing.ingredientName || '',
          ing.weight || null,
          ing.unit || 'g'
        ]);
        console.log(`[updateRecipe] 准备插入 ${ingredientValues.length} 条食材记录到食谱 ${id}`);
        await conn.query(ingredientSql, [ingredientValues]);
        console.log(`[updateRecipe] 成功插入食材记录`);
      } else {
        console.log(`[updateRecipe] 没有食材数据需要保存`);
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



