import { success } from '../../utils/response.js';
import {
  listItems,
  getItem,
  createItemRecord,
  updateItemRecord,
  removeItem,
  importPresetItems,
  getItemUsage
} from './ingredient-items.service.js';

export const listItemsController = async (req, res) => {
  const options = {
    categoryId: req.query.categoryId ? parseInt(req.query.categoryId, 10) : undefined,
    classification: req.query.classification || undefined,
    category: req.query.category || undefined,
    search: req.query.search || undefined,
    page: parseInt(req.query.page, 10) || 1,
    pageSize: parseInt(req.query.pageSize, 10) || 1000
  };
  const result = await listItems(options);
  return success(res, result);
};

export const getItemController = async (req, res) => {
  const item = await getItem(req.params.id);
  return success(res, item);
};

export const createItemController = async (req, res) => {
  const userId = req.user?.id;
  const item = await createItemRecord(req.body, userId);
  return success(res, item, 201);
};

export const updateItemController = async (req, res) => {
  const userId = req.user?.id;
  const item = await updateItemRecord(req.params.id, req.body, userId);
  return success(res, item);
};

export const deleteItemController = async (req, res) => {
  await removeItem(req.params.id);
  return success(res, { message: 'Item deleted successfully' });
};

export const importPresetItemsController = async (req, res) => {
  const userId = req.user?.id;
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }
  const result = await importPresetItems(items, userId);
  return success(res, { imported: result.length, items: result });
};

export const getItemUsageController = async (req, res) => {
  const { categoryId } = req.query;
  if (!categoryId) {
    return res.status(400).json({ error: 'CategoryId parameter is required' });
  }
  const stats = await getItemUsage(parseInt(categoryId, 10));
  return success(res, stats);
};




