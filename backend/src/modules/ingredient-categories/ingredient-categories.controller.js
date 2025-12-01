import { success } from '../../utils/response.js';
import {
  listCategories,
  getCategory,
  createCategoryRecord,
  updateCategoryRecord,
  removeCategory,
  importPresetCategories,
  getCategoryUsage
} from './ingredient-categories.service.js';

export const listCategoriesController = async (req, res) => {
  const options = {
    classification: req.query.classification || undefined,
    search: req.query.search || undefined,
    page: parseInt(req.query.page, 10) || 1,
    pageSize: parseInt(req.query.pageSize, 10) || 1000
  };
  const result = await listCategories(options);
  return success(res, result);
};

export const getCategoryController = async (req, res) => {
  const category = await getCategory(req.params.id);
  return success(res, category);
};

export const createCategoryController = async (req, res) => {
  const userId = req.user?.id;
  const category = await createCategoryRecord(req.body, userId);
  return success(res, category, 201);
};

export const updateCategoryController = async (req, res) => {
  const userId = req.user?.id;
  const category = await updateCategoryRecord(req.params.id, req.body, userId);
  return success(res, category);
};

export const deleteCategoryController = async (req, res) => {
  await removeCategory(req.params.id);
  return success(res, { message: 'Category deleted successfully' });
};

export const importPresetCategoriesController = async (req, res) => {
  const userId = req.user?.id;
  const { categories } = req.body;
  if (!Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({ error: 'Categories array is required' });
  }
  const result = await importPresetCategories(categories, userId);
  return success(res, { imported: result.length, categories: result });
};

export const getCategoryUsageController = async (req, res) => {
  const { classification } = req.query;
  if (!classification) {
    return res.status(400).json({ error: 'Classification parameter is required' });
  }
  const stats = await getCategoryUsage(classification);
  return success(res, stats);
};




