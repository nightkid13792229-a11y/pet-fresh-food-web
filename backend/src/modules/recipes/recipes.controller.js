import { success } from '../../utils/response.js';
import logger from '../../utils/logger.js';
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
  
  // 注意：repository 层已经手动构建了纯 JavaScript 对象，不需要再次序列化
  // 直接使用 result，避免序列化时丢失 ingredients 字段
  const serializedResult = result;
  
  // 添加日志：确认返回的数据包含 ingredients
  if (serializedResult.items && serializedResult.items.length > 0) {
    logger.info(`[listRecipesController] 返回 ${serializedResult.items.length} 条食谱`);
    const firstRecipe = serializedResult.items[0];
    logger.info(`[listRecipesController] 第一个食谱: ${firstRecipe.name}`);
    logger.info(`[listRecipesController] ingredients 存在: ${'ingredients' in firstRecipe}`);
    logger.info(`[listRecipesController] ingredients 数量: ${firstRecipe.ingredients ? firstRecipe.ingredients.length : 'N/A'}`);
    logger.info(`[listRecipesController] 第一个食谱的所有键: ${Object.keys(firstRecipe).join(', ')}`);
    if (firstRecipe.ingredients && firstRecipe.ingredients.length > 0) {
      logger.info(`[listRecipesController] 第一个食材: ${JSON.stringify(firstRecipe.ingredients[0])}`);
    } else {
      logger.warn(`[listRecipesController] 第一个食谱没有食材数据！`);
      logger.warn(`[listRecipesController] 第一个食谱的完整数据（前2000字符）: ${JSON.stringify(firstRecipe, null, 2).substring(0, 2000)}`);
    }
    // 确保 ingredients 字段存在
    if (!('ingredients' in firstRecipe)) {
      logger.error(`[listRecipesController] 警告：第一个食谱缺少 ingredients 字段！`);
      firstRecipe.ingredients = [];
    }
  }
  
  // 最终验证：确保所有食谱都有 ingredients 字段
  if (serializedResult.items) {
    serializedResult.items.forEach((recipe, index) => {
      if (!('ingredients' in recipe)) {
        logger.error(`[listRecipesController] 警告：食谱 ${index} (${recipe.name || recipe.id}) 缺少 ingredients 字段！`);
        recipe.ingredients = [];
      }
      if (!Array.isArray(recipe.ingredients)) {
        logger.error(`[listRecipesController] 警告：食谱 ${index} (${recipe.name || recipe.id}) ingredients 不是数组！`);
        recipe.ingredients = [];
      }
    });
  }
  
  return success(res, serializedResult);
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




