import { fetchRecipe, fetchRecipes } from './recipes.service.js';

export const listRecipes = async (_req, res) => {
  const recipes = await fetchRecipes();
  res.json({ success: true, data: recipes });
};

export const getRecipe = async (req, res) => {
  const recipe = await fetchRecipe(Number(req.params.id));
  res.json({ success: true, data: recipe });
};



