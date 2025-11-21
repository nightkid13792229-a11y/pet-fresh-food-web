import { query } from '../../db/pool.js';

const baseSelect = `
  SELECT
    o.id,
    o.order_number AS orderNumber,
    o.customer_id AS customerId,
    o.pet_id AS petId,
    o.recipe_id AS recipeId,
    o.production_date AS productionDate,
    o.total_servings AS totalServings,
    o.total_price AS totalPrice,
    o.status,
    o.payment_status AS paymentStatus,
    o.created_at AS createdAt,
    o.updated_at AS updatedAt,
    cu.name AS customerName,
    cu.email AS customerEmail,
    pets.name AS petName,
    recipes.name AS recipeName
  FROM orders o
  LEFT JOIN users cu ON cu.id = o.customer_id
  LEFT JOIN pet_profiles pets ON pets.id = o.pet_id
  LEFT JOIN recipes recipes ON recipes.id = o.recipe_id
`;

const buildFilters = ({ status, paymentStatus, keyword, customerId }) => {
  const conditions = [];
  const params = [];

  if (customerId) {
    conditions.push('o.customer_id = ?');
    params.push(customerId);
  }
  if (status) {
    conditions.push('o.status = ?');
    params.push(status);
  }
  if (paymentStatus) {
    conditions.push('o.payment_status = ?');
    params.push(paymentStatus);
  }
  if (keyword) {
    conditions.push('(o.order_number LIKE ? OR cu.name LIKE ? OR cu.email LIKE ?)');
    const like = `%${keyword}%`;
    params.push(like, like, like);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
};

export const findOrders = async ({
  page = 1,
  pageSize = 20,
  status,
  paymentStatus,
  keyword,
  customerId
}) => {
  const pageNumber = Number(page) || 1;
  const size = Number(pageSize) || 20;
  const limit = Math.min(size, 100);
  const offset = (pageNumber - 1) * limit;

  const { whereClause, params } = buildFilters({ status, paymentStatus, keyword, customerId });

  const paginationClause = `ORDER BY o.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  const rows = await query(`${baseSelect} ${whereClause} ${paginationClause}`, params);

  const [{ total }] = await query(
    `SELECT COUNT(1) AS total FROM orders o LEFT JOIN users cu ON cu.id = o.customer_id ${whereClause}`,
    params
  );

  return { rows, total, limit, offset, page: pageNumber };
};

export const getOrderById = async (id) => {
  const sql = `${baseSelect} WHERE o.id = ? LIMIT 1`;
  const rows = await query(sql, [id]);
  if (!rows[0]) {
    return null;
  }
  const itemsSql = `
    SELECT
      id,
      ingredient_name AS ingredientName,
      unit,
      quantity
    FROM order_items
    WHERE order_id = ?
    ORDER BY id ASC
  `;
  const items = await query(itemsSql, [id]);
  return { ...rows[0], items };
};

export const createOrder = async (data) => {
  const sql = `
    INSERT INTO orders
      (order_number, customer_id, pet_id, recipe_id, production_date, total_servings,
       total_price, status, payment_status, created_at, updated_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;
  const params = [
    data.orderNumber,
    data.customerId,
    data.petId,
    data.recipeId,
    data.productionDate,
    data.totalServings,
    data.totalPrice,
    data.status || 'pending',
    data.paymentStatus || 'unpaid'
  ];
  const result = await query(sql, params);
  return { id: result.insertId, ...data };
};

export const replaceOrderItems = async (orderId, items = []) => {
  await query('DELETE FROM order_items WHERE order_id = ?', [orderId]);

  if (!items.length) {
    return;
  }

  const values = items.map(() => '(?, ?, ?, ?, NOW(), NOW())').join(', ');
  const flatParams = items.flatMap((item) => [
    orderId,
    item.ingredientName,
    item.unit,
    item.quantity
  ]);

  const sql = `
    INSERT INTO order_items (order_id, ingredient_name, unit, quantity, created_at, updated_at)
    VALUES ${values}
  `;
  await query(sql, flatParams);
};

export const updateOrderStatus = async (id, { status, paymentStatus }) => {
  const fields = [];
  const params = [];

  if (status) {
    fields.push('status = ?');
    params.push(status);
  }
  if (paymentStatus) {
    fields.push('payment_status = ?');
    params.push(paymentStatus);
  }

  if (!fields.length) {
    return null;
  }

  const sql = `
    UPDATE orders
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = ?
  `;
  params.push(id);
  const result = await query(sql, params);
  return result.affectedRows > 0;
};

export const updateOrder = async (id, data = {}) => {
  const fields = [];
  const params = [];

  const mappings = {
    customerId: 'customer_id',
    petId: 'pet_id',
    recipeId: 'recipe_id',
    productionDate: 'production_date',
    totalServings: 'total_servings',
    totalPrice: 'total_price',
    status: 'status',
    paymentStatus: 'payment_status'
  };

  Object.entries(mappings).forEach(([key, column]) => {
    if (data[key] !== undefined) {
      fields.push(`${column} = ?`);
      params.push(data[key]);
    }
  });

  if (!fields.length) {
    return false;
  }

  const sql = `
    UPDATE orders
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = ?
  `;
  params.push(id);
  const result = await query(sql, params);
  return result.affectedRows > 0;
};

