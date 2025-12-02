import { query } from '../../db/pool.js';

const baseSelect = `
  SELECT
    id,
    code,
    category,
    name,
    brand,
    source,
    cost,
    quantity,
    unit,
    price_per_500 AS pricePer500,
    edible_portion AS ediblePortion,
    edible_price_per_500 AS ediblePricePer500,
    weight_per_unit AS weightPerUnit,
    classification,
    description,
    main_function AS mainFunction,
    subject,
    part,
    origin_type AS originType,
    model,
    unit_content AS unitContent,
    nutrient_unit AS nutrientUnit,
    main_nutrient AS mainNutrient,
    price_per_100_nutrient_unit AS pricePer100NutrientUnit,
    created_at AS createdAt,
    updated_at AS updatedAt,
    created_by AS createdBy,
    updated_by AS updatedBy
  FROM ingredients
`;

export const findAllIngredients = async (options = {}) => {
  const { search, category, classification, subject, part, originType, page = 1, pageSize = 20 } = options;
  let sql = baseSelect;
  const countSql = 'SELECT COUNT(*) as total FROM ingredients';
  const params = [];
  const conditions = [];

  if (search && search.trim()) {
    conditions.push('(name LIKE ? OR brand LIKE ? OR code LIKE ?)');
    const searchPattern = `%${search.trim()}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (category && category.trim()) {
    conditions.push('category = ?');
    params.push(category.trim());
  }

  if (classification && classification.trim()) {
    conditions.push('classification = ?');
    params.push(classification.trim());
  }

  if (subject && subject.trim()) {
    conditions.push('subject = ?');
    params.push(subject.trim());
  }

  if (part && part.trim()) {
    conditions.push('part = ?');
    params.push(part.trim());
  }

  if (originType && originType.trim()) {
    conditions.push('origin_type = ?');
    params.push(originType.trim());
  }

  const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

  // 获取总数
  const countResult = await query(countSql + whereClause, params);
  const total = countResult[0]?.total || 0;

  // 获取分页数据
  sql += whereClause;
  sql += ' ORDER BY updated_at DESC, created_at DESC';

  if (pageSize > 0) {
    const offset = (page - 1) * pageSize;
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;
  }

  const items = await query(sql, params);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
};

export const findIngredientById = async (id) => {
  const sql = `${baseSelect} WHERE id = ? LIMIT 1`;
  const rows = await query(sql, [id]);
  return rows[0] || null;
};

export const findIngredientByCode = async (code) => {
  const sql = `${baseSelect} WHERE code = ? LIMIT 1`;
  const rows = await query(sql, [code]);
  return rows[0] || null;
};

export const createIngredient = async (payload, userId) => {
  const sql = `
    INSERT INTO ingredients (
      code, category, name, brand, source, cost, quantity, unit,
      price_per_500, edible_portion, edible_price_per_500, weight_per_unit,
      classification, description, main_function,
      subject, part, origin_type, model, unit_content, nutrient_unit, main_nutrient, price_per_100_nutrient_unit,
      created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    payload.code,
    payload.category,
    payload.name,
    payload.brand || null,
    payload.source || null,
    payload.cost || null,
    payload.quantity || null,
    payload.unit || 'g',
    payload.pricePer500 || null,
    payload.ediblePortion !== undefined ? payload.ediblePortion : 1.0,
    payload.ediblePricePer500 || null,
    payload.weightPerUnit || null,
    payload.classification || null,
    payload.description || null,
    payload.mainFunction || null,
    payload.subject || null,
    payload.part || null,
    payload.originType || null,
    payload.model || null,
    payload.unitContent || null,
    payload.nutrientUnit || null,
    payload.mainNutrient || null,
    payload.pricePer100NutrientUnit || null,
    userId || null
  ];
  
  const result = await query(sql, params);
  return result.insertId;
};

export const updateIngredient = async (id, payload, userId) => {
  const fields = [];
  const params = [];
  
  if (payload.code !== undefined) {
    fields.push('code = ?');
    params.push(payload.code);
  }
  if (payload.category !== undefined) {
    fields.push('category = ?');
    params.push(payload.category);
  }
  if (payload.name !== undefined) {
    fields.push('name = ?');
    params.push(payload.name);
  }
  if (payload.brand !== undefined) {
    fields.push('brand = ?');
    params.push(payload.brand || null);
  }
  if (payload.source !== undefined) {
    fields.push('source = ?');
    params.push(payload.source || null);
  }
  if (payload.cost !== undefined) {
    fields.push('cost = ?');
    params.push(payload.cost || null);
  }
  if (payload.quantity !== undefined) {
    fields.push('quantity = ?');
    params.push(payload.quantity || null);
  }
  if (payload.unit !== undefined) {
    fields.push('unit = ?');
    params.push(payload.unit);
  }
  if (payload.pricePer500 !== undefined) {
    fields.push('price_per_500 = ?');
    params.push(payload.pricePer500 || null);
  }
  if (payload.ediblePortion !== undefined) {
    fields.push('edible_portion = ?');
    params.push(payload.ediblePortion);
  }
  if (payload.ediblePricePer500 !== undefined) {
    fields.push('edible_price_per_500 = ?');
    params.push(payload.ediblePricePer500 || null);
  }
  if (payload.weightPerUnit !== undefined) {
    fields.push('weight_per_unit = ?');
    params.push(payload.weightPerUnit || null);
  }
  if (payload.classification !== undefined) {
    fields.push('classification = ?');
    params.push(payload.classification || null);
  }
  if (payload.description !== undefined) {
    fields.push('description = ?');
    params.push(payload.description || null);
  }
  if (payload.mainFunction !== undefined) {
    fields.push('main_function = ?');
    params.push(payload.mainFunction || null);
  }
  if (payload.subject !== undefined) {
    fields.push('subject = ?');
    params.push(payload.subject || null);
  }
  if (payload.part !== undefined) {
    fields.push('part = ?');
    params.push(payload.part || null);
  }
  if (payload.originType !== undefined) {
    fields.push('origin_type = ?');
    params.push(payload.originType || null);
  }
  if (payload.model !== undefined) {
    fields.push('model = ?');
    params.push(payload.model || null);
  }
  if (payload.unitContent !== undefined) {
    fields.push('unit_content = ?');
    params.push(payload.unitContent || null);
  }
  if (payload.nutrientUnit !== undefined) {
    fields.push('nutrient_unit = ?');
    params.push(payload.nutrientUnit || null);
  }
  if (payload.mainNutrient !== undefined) {
    fields.push('main_nutrient = ?');
    params.push(payload.mainNutrient || null);
  }
  if (payload.pricePer100NutrientUnit !== undefined) {
    fields.push('price_per_100_nutrient_unit = ?');
    params.push(payload.pricePer100NutrientUnit || null);
  }
  
  if (fields.length === 0) {
    return null;
  }
  
  fields.push('updated_by = ?');
  params.push(userId || null);
  params.push(id);
  
  const sql = `UPDATE ingredients SET ${fields.join(', ')} WHERE id = ?`;
  await query(sql, params);
  
  return findIngredientById(id);
};

export const deleteIngredient = async (id) => {
  const sql = 'DELETE FROM ingredients WHERE id = ?';
  await query(sql, [id]);
};




