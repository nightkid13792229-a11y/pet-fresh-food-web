import { query } from '../../db/pool.js';

const baseSelect = `
  SELECT
    id,
    category,
    name,
    size_category AS sizeCategory,
    weight_min AS weightMin,
    weight_max AS weightMax,
    maturity_months AS maturityMonths,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM dog_breeds
`;

export const findAllBreeds = async (options = {}) => {
  const { category, sizeCategory, search, page = 1, pageSize = 100 } = options;
  let sql = baseSelect;
  const countSql = 'SELECT COUNT(*) as total FROM dog_breeds';
  const params = [];
  const conditions = [];

  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }

  if (sizeCategory) {
    conditions.push('size_category = ?');
    params.push(sizeCategory);
  }

  if (search) {
    conditions.push('(name LIKE ? OR category LIKE ?)');
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern);
  }

  const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

  // 获取总数
  const countResult = await query(countSql + whereClause, params);
  const total = countResult[0]?.total || 0;

  // 获取分页数据
  sql += whereClause;
  sql += ' ORDER BY category, name';

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

export const findBreedById = async (id) => {
  const sql = `${baseSelect} WHERE id = ? LIMIT 1`;
  const rows = await query(sql, [id]);
  return rows[0] || null;
};

export const findBreedByCategoryAndName = async (category, name) => {
  const sql = `${baseSelect} WHERE category = ? AND name = ? LIMIT 1`;
  const rows = await query(sql, [category, name]);
  return rows[0] || null;
};

export const createBreed = async (payload) => {
  const sql = `
    INSERT INTO dog_breeds (
      category,
      name,
      size_category,
      weight_min,
      weight_max,
      maturity_months
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;
  const params = [
    payload.category,
    payload.name,
    payload.sizeCategory,
    payload.weightMin || null,
    payload.weightMax || null,
    payload.maturityMonths || null
  ];
  const result = await query(sql, params);
  return findBreedById(result.insertId);
};

export const updateBreed = async (id, payload) => {
  const fields = [];
  const params = [];

  if (payload.category !== undefined) {
    fields.push('category = ?');
    params.push(payload.category);
  }
  if (payload.name !== undefined) {
    fields.push('name = ?');
    params.push(payload.name);
  }
  if (payload.sizeCategory !== undefined) {
    fields.push('size_category = ?');
    params.push(payload.sizeCategory);
  }
  if (payload.weightMin !== undefined) {
    fields.push('weight_min = ?');
    params.push(payload.weightMin);
  }
  if (payload.weightMax !== undefined) {
    fields.push('weight_max = ?');
    params.push(payload.weightMax);
  }
  if (payload.maturityMonths !== undefined) {
    fields.push('maturity_months = ?');
    params.push(payload.maturityMonths);
  }

  if (fields.length === 0) {
    return findBreedById(id);
  }

  fields.push('updated_at = NOW()');
  params.push(id);

  const sql = `UPDATE dog_breeds SET ${fields.join(', ')} WHERE id = ?`;
  await query(sql, params);
  return findBreedById(id);
};

export const deleteBreed = async (id) => {
  const sql = 'DELETE FROM dog_breeds WHERE id = ?';
  const result = await query(sql, [id]);
  return result.affectedRows > 0;
};

export const getBreedCategories = async () => {
  const sql = 'SELECT DISTINCT category FROM dog_breeds ORDER BY category';
  return query(sql);
};


