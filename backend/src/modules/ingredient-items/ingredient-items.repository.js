import { query } from '../../db/pool.js';

const baseSelect = `
  SELECT
    ii.id,
    ii.category_id AS categoryId,
    ii.name,
    ii.display_order AS displayOrder,
    ii.created_at AS createdAt,
    ii.updated_at AS updatedAt,
    ii.created_by AS createdBy,
    ii.updated_by AS updatedBy,
    ic.classification,
    ic.category AS categoryName
  FROM ingredient_items ii
  INNER JOIN ingredient_categories ic ON ii.category_id = ic.id
`;

export const findAllItems = async (options = {}) => {
  const { categoryId, classification, category, search, page = 1, pageSize = 1000 } = options;
  let sql = baseSelect;
  const countSql = 'SELECT COUNT(*) as total FROM ingredient_items ii INNER JOIN ingredient_categories ic ON ii.category_id = ic.id';
  const params = [];
  const conditions = [];

  if (categoryId) {
    conditions.push('ii.category_id = ?');
    params.push(categoryId);
  }

  if (classification) {
    conditions.push('ic.classification = ?');
    params.push(classification);
  }

  if (category) {
    conditions.push('ic.category = ?');
    params.push(category);
  }

  if (search) {
    conditions.push('ii.name LIKE ?');
    const searchPattern = `%${search}%`;
    params.push(searchPattern);
  }

  const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

  // 获取总数
  const countResult = await query(countSql + whereClause, params);
  const total = countResult[0]?.total || 0;

  // 获取分页数据
  sql += whereClause;
  sql += ' ORDER BY ii.display_order ASC, ii.name ASC';

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

export const findItemById = async (id) => {
  const sql = `${baseSelect} WHERE ii.id = ? LIMIT 1`;
  const rows = await query(sql, [id]);
  return rows[0] || null;
};

export const findItemByCategoryIdAndName = async (categoryId, name) => {
  const sql = `${baseSelect} WHERE ii.category_id = ? AND ii.name = ? LIMIT 1`;
  const rows = await query(sql, [categoryId, name]);
  return rows[0] || null;
};

export const createItem = async (payload, userId) => {
  // 获取当前最大display_order
  const maxOrderResult = await query(
    'SELECT MAX(display_order) as maxOrder FROM ingredient_items WHERE category_id = ?',
    [payload.categoryId]
  );
  const maxOrder = maxOrderResult[0]?.maxOrder || 0;
  const displayOrder = payload.displayOrder !== undefined ? payload.displayOrder : maxOrder + 1;

  const sql = `
    INSERT INTO ingredient_items (
      category_id,
      name,
      display_order,
      created_by
    ) VALUES (?, ?, ?, ?)
  `;
  const params = [
    payload.categoryId,
    payload.name,
    displayOrder,
    userId || null
  ];
  const result = await query(sql, params);
  return findItemById(result.insertId);
};

export const updateItem = async (id, payload, userId) => {
  const fields = [];
  const params = [];

  if (payload.categoryId !== undefined) {
    fields.push('category_id = ?');
    params.push(payload.categoryId);
  }
  if (payload.name !== undefined) {
    fields.push('name = ?');
    params.push(payload.name);
  }
  if (payload.displayOrder !== undefined) {
    fields.push('display_order = ?');
    params.push(payload.displayOrder);
  }

  if (fields.length === 0) {
    return findItemById(id);
  }

  fields.push('updated_by = ?');
  params.push(userId || null);
  params.push(id);

  const sql = `UPDATE ingredient_items SET ${fields.join(', ')} WHERE id = ?`;
  await query(sql, params);
  return findItemById(id);
};

export const deleteItem = async (id) => {
  const sql = 'DELETE FROM ingredient_items WHERE id = ?';
  const result = await query(sql, [id]);
  return result.affectedRows > 0;
};

// 批量创建项目（用于导入预设项目）
export const createItemsBatch = async (items, userId) => {
  if (!items || items.length === 0) {
    return [];
  }

  const results = [];
  for (const item of items) {
    try {
      // 检查是否已存在
      const existing = await findItemByCategoryIdAndName(item.categoryId, item.name);
      if (!existing) {
        const created = await createItem(item, userId);
        results.push(created);
      }
    } catch (error) {
      console.error(`Failed to create item ${item.categoryId}/${item.name}:`, error);
    }
  }
  return results;
};

// 获取项目使用统计（每个项目下有多少原料）
export const getItemUsageStats = async (categoryId) => {
  const sql = `
    SELECT 
      ii.id,
      ii.name,
      COUNT(i.id) as ingredientCount
    FROM ingredient_items ii
    LEFT JOIN ingredients i ON i.category = (SELECT category FROM ingredient_categories WHERE id = ?) AND i.name = ii.name
    WHERE ii.category_id = ?
    GROUP BY ii.id, ii.name
    ORDER BY ii.display_order ASC, ii.name ASC
  `;
  return query(sql, [categoryId, categoryId]);
};




