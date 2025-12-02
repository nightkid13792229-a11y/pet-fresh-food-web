import { success } from '../../utils/response.js';
import {
  fetchRecipes,
  fetchRecipe,
  createRecipeRecord,
  updateRecipeRecord,
  removeRecipe
} from './recipes.service.js';

export const listRecipesController = async (req, res) => {
  const options = {
    search: req.query.search || undefined,
    lifeStage: req.query.lifeStage || undefined,
    recipeType: req.query.recipeType || undefined,
    page: parseInt(req.query.page, 10) || 1,
    pageSize: parseInt(req.query.pageSize, 10) || 20
  };
  const result = await fetchRecipes(options);
  return success(res, result);
};

export const getRecipeController = async (req, res) => {
  const recipe = await fetchRecipe(Number(req.params.id));
  return success(res, recipe);
};

export const createRecipeController = async (req, res) => {
  const recipe = await createRecipeRecord(req.body, req.user?.id);
  return success(res, recipe, 201);
};

export const updateRecipeController = async (req, res) => {
  const recipe = await updateRecipeRecord(req.params.id, req.body, req.user?.id);
  return success(res, recipe);
};

export const deleteRecipeController = async (req, res) => {
  await removeRecipe(req.params.id);
  return success(res, { message: '食谱删除成功' });
};




