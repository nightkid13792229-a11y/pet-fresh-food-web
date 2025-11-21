import createError from 'http-errors';
import { getRecipeById, listRecipes } from './recipes.repository.js';

export const fetchRecipes = async () => {
  return listRecipes();
};

export const fetchRecipe = async (id) => {
  const recipe = await getRecipeById(id);
  if (!recipe) {
    throw createError(404, 'Recipe not found');
  }
  return recipe;
};



