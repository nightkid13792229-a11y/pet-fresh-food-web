 import { query } from '../../db/pool.js';

const baseSelect = `
  SELECT
    id,
    customer_id AS customerId,
    contact_name AS contactName,
    contact_phone AS contactPhone,
    region,
    detail,
    is_default AS isDefault,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM customer_addresses
`;

export const findAddressesByCustomer = async (customerId) => {
  const sql = `${baseSelect} WHERE customer_id = ? ORDER BY is_default DESC, updated_at DESC`;
  return query(sql, [customerId]);
};

export const findLatestAddressByCustomer = async (customerId, excludeId = null) => {
  let sql = `${baseSelect} WHERE customer_id = ?`;
  const params = [customerId];
  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }
  sql += ' ORDER BY created_at DESC LIMIT 1';
  const rows = await query(sql, params);
  return rows[0] || null;
};

export const findAddressById = async (id) => {
  const sql = `${baseSelect} WHERE id = ? LIMIT 1`;
  const rows = await query(sql, [id]);
  return rows[0] || null;
};

export const createAddress = async ({
  customerId,
  contactName,
  contactPhone,
  region,
  detail,
  isDefault
}) => {
  const sql = `
    INSERT INTO customer_addresses
      (customer_id, contact_name, contact_phone, region, detail, is_default, created_at, updated_at)
    VALUES
      (?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;
  const result = await query(sql, [
    customerId,
    contactName,
    contactPhone,
    region,
    detail,
    isDefault ? 1 : 0
  ]);
  return { id: result.insertId };
};

export const updateAddress = async (id, fields) => {
  const updates = [];
  const params = [];

  if (fields.contactName !== undefined) {
    updates.push('contact_name = ?');
    params.push(fields.contactName);
  }
  if (fields.contactPhone !== undefined) {
    updates.push('contact_phone = ?');
    params.push(fields.contactPhone);
  }
  if (fields.region !== undefined) {
    updates.push('region = ?');
    params.push(fields.region);
  }
  if (fields.detail !== undefined) {
    updates.push('detail = ?');
    params.push(fields.detail);
  }
  if (fields.isDefault !== undefined) {
    updates.push('is_default = ?');
    params.push(fields.isDefault ? 1 : 0);
  }

  if (!updates.length) {
    return false;
  }

  const sql = `
    UPDATE customer_addresses
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE id = ?
  `;
  params.push(id);
  const result = await query(sql, params);
  return result.affectedRows > 0;
};

export const deleteAddress = async (id) => {
  const sql = 'DELETE FROM customer_addresses WHERE id = ? LIMIT 1';
  const result = await query(sql, [id]);
  return result.affectedRows > 0;
};

export const clearDefaultFlag = async (customerId, excludeId = null) => {
  let sql = 'UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?';
  const params = [customerId];
  if (excludeId) {
    sql += ' AND id <> ?';
    params.push(excludeId);
  }
  await query(sql, params);
};


