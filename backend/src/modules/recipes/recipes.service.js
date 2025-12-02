import createError from 'http-errors';
import {
  getRecipeById,
  listRecipes,
  findRecipeByCode,
  createRecipe,
  updateRecipe,
  deleteRecipe
} from './recipes.repository.js';

export const fetchRecipes = async (options = {}) => {
  return listRecipes(options);
};

export const fetchRecipe = async (id) => {
  const recipe = await getRecipeById(id);
  if (!recipe) {
    throw createError(404, 'Recipe not found');
  }
  return recipe;
};

export const createRecipeRecord = async (payload, userId) => {
  // 检查编号是否已存在
  if (payload.code) {
    const existing = await findRecipeByCode(payload.code);
    if (existing) {
      throw createError(409, '食谱编号已存在');
    }
  }
  
  const id = await createRecipe(payload, userId);
  return getRecipeById(id);
};

export const updateRecipeRecord = async (id, payload, userId) => {
  const recipe = await getRecipeById(id);
  if (!recipe) {
    throw createError(404, 'Recipe not found');
  }
  
  // 如果编号改变，检查新编号是否已存在
  if (payload.code && payload.code !== recipe.code) {
    const codeExists = await findRecipeByCode(payload.code);
    if (codeExists) {
      throw createError(409, '食谱编号已存在');
    }
  }
  
  await updateRecipe(id, payload, userId);
  return getRecipeById(id);
};

export const removeRecipe = async (id) => {
  const recipe = await getRecipeById(id);
  if (!recipe) {
    throw createError(404, 'Recipe not found');
  }
  
  await deleteRecipe(id);
};




