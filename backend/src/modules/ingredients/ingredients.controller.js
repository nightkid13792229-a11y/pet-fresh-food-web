import { success } from '../../utils/response.js';
import {
  listIngredients,
  getIngredient,
  createIngredientRecord,
  updateIngredientRecord,
  removeIngredient
} from './ingredients.service.js';

export const listIngredientsController = async (req, res) => {
  const options = {
    search: req.query.search && req.query.search.trim() ? req.query.search.trim() : undefined,
    category: req.query.category && req.query.category.trim() ? req.query.category.trim() : undefined,
    classification: req.query.classification && req.query.classification.trim() ? req.query.classification.trim() : undefined,
    subject: req.query.subject && req.query.subject.trim() ? req.query.subject.trim() : undefined,
    part: req.query.part && req.query.part.trim() ? req.query.part.trim() : undefined,
    originType: req.query.originType && req.query.originType.trim() ? req.query.originType.trim() : undefined,
    page: parseInt(req.query.page, 10) || 1,
    pageSize: parseInt(req.query.pageSize, 10) || 20
  };
  const result = await listIngredients(options);
  return success(res, result);
};

export const getIngredientController = async (req, res) => {
  const ingredient = await getIngredient(req.params.id);
  return success(res, ingredient);
};

export const createIngredientController = async (req, res) => {
  const ingredient = await createIngredientRecord(req.body, req.user?.id);
  return success(res, ingredient, 201);
};

export const updateIngredientController = async (req, res) => {
  const ingredient = await updateIngredientRecord(req.params.id, req.body, req.user?.id);
  return success(res, ingredient);
};

export const deleteIngredientController = async (req, res) => {
  await removeIngredient(req.params.id);
  return success(res, { message: '原料删除成功' });
};





