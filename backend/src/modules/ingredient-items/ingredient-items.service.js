import createError from 'http-errors';
import { query } from '../../db/pool.js';
import {
  findAllItems,
  findItemById,
  findItemByCategoryIdAndName,
  createItem,
  updateItem,
  deleteItem,
  createItemsBatch,
  getItemUsageStats
} from './ingredient-items.repository.js';

export const listItems = async (options = {}) => {
  return findAllItems(options);
};

export const getItem = async (id) => {
  const item = await findItemById(id);
  if (!item) {
    throw createError(404, 'Item not found');
  }
  return item;
};

export const createItemRecord = async (payload, userId) => {
  // Check if item with same categoryId and name already exists
  const existing = await findItemByCategoryIdAndName(
    payload.categoryId,
    payload.name
  );
  if (existing) {
    throw createError(409, 'Item with this category and name already exists');
  }

  return createItem(payload, userId);
};

export const updateItemRecord = async (id, payload, userId) => {
  const item = await findItemById(id);
  if (!item) {
    throw createError(404, 'Item not found');
  }

  // If categoryId or name is being updated, check for duplicates
  if (payload.categoryId || payload.name) {
    const newCategoryId = payload.categoryId || item.categoryId;
    const newName = payload.name || item.name;
    const existing = await findItemByCategoryIdAndName(newCategoryId, newName);
    if (existing && existing.id !== id) {
      throw createError(409, 'Item with this category and name already exists');
    }
  }

  return updateItem(id, payload, userId);
};

export const removeItem = async (id) => {
  const item = await findItemById(id);
  if (!item) {
    throw createError(404, 'Item not found');
  }

  // Check if item is being used by any ingredients
  const usageCheck = await query(
    'SELECT COUNT(*) as count FROM ingredients WHERE category = ? AND name = ?',
    [item.categoryName, item.name]
  );
  const usageCount = usageCheck[0]?.count || 0;
  if (usageCount > 0) {
    throw createError(409, `Cannot delete item: ${usageCount} ingredient(s) are using this item`);
  }

  const deleted = await deleteItem(id);
  if (!deleted) {
    throw createError(500, 'Failed to delete item');
  }

  return true;
};

export const importPresetItems = async (items, userId) => {
  return createItemsBatch(items, userId);
};

export const getItemUsage = async (categoryId) => {
  return getItemUsageStats(categoryId);
};




