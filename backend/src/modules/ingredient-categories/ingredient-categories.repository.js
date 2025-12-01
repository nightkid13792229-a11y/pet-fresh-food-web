import { query } from '../../db/pool.js';

const baseSelect = `
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
`;

export const findAllCategories = async (options = {}) => {
  const { classification, search, page = 1, pageSize = 1000 } = options;
  let sql = baseSelect;
  const countSql = 'SELECT COUNT(*) as total FROM ingredient_categories';
  const params = [];
  const conditions = [];

  if (classification) {
    conditions.push('classification = ?');
    params.push(classification);
  }

  if (search) {
    conditions.push('category LIKE ?');
    const searchPattern = `%${search}%`;
    params.push(searchPattern);
  }

  const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

  // 获取总数
  const countResult = await query(countSql + whereClause, params);
  const total = countResult[0]?.total || 0;

  // 获取分页数据
  sql += whereClause;
  sql += ' ORDER BY display_order ASC, category ASC';

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

export const findCategoryById = async (id) => {
  const sql = `${baseSelect} WHERE id = ? LIMIT 1`;
  const rows = await query(sql, [id]);
  return rows[0] || null;
};

export const findCategoryByClassificationAndCategory = async (classification, category) => {
  const sql = `${baseSelect} WHERE classification = ? AND category = ? LIMIT 1`;
  const rows = await query(sql, [classification, category]);
  return rows[0] || null;
};

export const createCategory = async (payload, userId) => {
  // 获取当前最大display_order
  const maxOrderResult = await query(
    'SELECT MAX(display_order) as maxOrder FROM ingredient_categories WHERE classification = ?',
    [payload.classification]
  );
  const maxOrder = maxOrderResult[0]?.maxOrder || 0;
  const displayOrder = payload.displayOrder !== undefined ? payload.displayOrder : maxOrder + 1;

  const sql = `
    INSERT INTO ingredient_categories (
      classification,
      category,
      display_order,
      created_by
    ) VALUES (?, ?, ?, ?)
  `;
  const params = [
    payload.classification,
    payload.category,
    displayOrder,
    userId || null
  ];
  const result = await query(sql, params);
  return findCategoryById(result.insertId);
};

export const updateCategory = async (id, payload, userId) => {
  const fields = [];
  const params = [];

  if (payload.classification !== undefined) {
    fields.push('classification = ?');
    params.push(payload.classification);
  }
  if (payload.category !== undefined) {
    fields.push('category = ?');
    params.push(payload.category);
  }
  if (payload.displayOrder !== undefined) {
    fields.push('display_order = ?');
    params.push(payload.displayOrder);
  }

  if (fields.length === 0) {
    return findCategoryById(id);
  }

  fields.push('updated_by = ?');
  params.push(userId || null);
  params.push(id);

  const sql = `UPDATE ingredient_categories SET ${fields.join(', ')} WHERE id = ?`;
  await query(sql, params);
  return findCategoryById(id);
};

export const deleteCategory = async (id) => {
  const sql = 'DELETE FROM ingredient_categories WHERE id = ?';
  const result = await query(sql, [id]);
  return result.affectedRows > 0;
};

// 批量创建分类（用于导入预设分类）
export const createCategoriesBatch = async (categories, userId) => {
  if (!categories || categories.length === 0) {
    return [];
  }

  const results = [];
  for (const cat of categories) {
    try {
      // 检查是否已存在
      const existing = await findCategoryByClassificationAndCategory(cat.classification, cat.category);
      if (!existing) {
        const created = await createCategory(cat, userId);
        results.push(created);
      }
    } catch (error) {
      console.error(`Failed to create category ${cat.classification}/${cat.category}:`, error);
    }
  }
  return results;
};

// 获取分类使用统计（每个分类下有多少原料）
export const getCategoryUsageStats = async (classification) => {
  const sql = `
    SELECT 
      ic.id,
      ic.category,
      COUNT(i.id) as ingredientCount
    FROM ingredient_categories ic
    LEFT JOIN ingredients i ON i.classification = ic.classification AND i.category = ic.category
    WHERE ic.classification = ?
    GROUP BY ic.id, ic.category
    ORDER BY ic.display_order ASC, ic.category ASC
  `;
  return query(sql, [classification]);
};




