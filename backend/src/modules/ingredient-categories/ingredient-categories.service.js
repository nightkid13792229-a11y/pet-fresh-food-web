import createError from 'http-errors';
import { query } from '../../db/pool.js';
import {
  findAllCategories,
  findCategoryById,
  findCategoryByClassificationAndCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  createCategoriesBatch,
  getCategoryUsageStats
} from './ingredient-categories.repository.js';

export const listCategories = async (options = {}) => {
  return findAllCategories(options);
};

export const getCategory = async (id) => {
  const category = await findCategoryById(id);
  if (!category) {
    throw createError(404, 'Category not found');
  }
  return category;
};

export const createCategoryRecord = async (payload, userId) => {
  // Check if category with same classification and category already exists
  const existing = await findCategoryByClassificationAndCategory(
    payload.classification,
    payload.category
  );
  if (existing) {
    throw createError(409, 'Category with this classification and name already exists');
  }

  return createCategory(payload, userId);
};

export const updateCategoryRecord = async (id, payload, userId) => {
  const category = await findCategoryById(id);
  if (!category) {
    throw createError(404, 'Category not found');
  }

  // If classification or category is being updated, check for duplicates
  if (payload.classification || payload.category) {
    const newClassification = payload.classification || category.classification;
    const newCategory = payload.category || category.category;
    const existing = await findCategoryByClassificationAndCategory(newClassification, newCategory);
    if (existing && existing.id !== id) {
      throw createError(409, 'Category with this classification and name already exists');
    }
  }

  return updateCategory(id, payload, userId);
};

export const removeCategory = async (id) => {
  const category = await findCategoryById(id);
  if (!category) {
    throw createError(404, 'Category not found');
  }

  // Check if category is being used by any ingredients
  const usageCheck = await query(
    'SELECT COUNT(*) as count FROM ingredients WHERE classification = ? AND category = ?',
    [category.classification, category.category]
  );
  const usageCount = usageCheck[0]?.count || 0;
  if (usageCount > 0) {
    throw createError(409, `Cannot delete category: ${usageCount} ingredient(s) are using this category`);
  }

  const deleted = await deleteCategory(id);
  if (!deleted) {
    throw createError(500, 'Failed to delete category');
  }

  return true;
};

export const importPresetCategories = async (categories, userId) => {
  return createCategoriesBatch(categories, userId);
};

export const getCategoryUsage = async (classification) => {
  return getCategoryUsageStats(classification);
};

