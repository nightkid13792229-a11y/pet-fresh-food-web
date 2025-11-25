import createError from 'http-errors';
import {
  findAllIngredients,
  findIngredientById,
  findIngredientByCode,
  createIngredient,
  updateIngredient,
  deleteIngredient
} from './ingredients.repository.js';

export const listIngredients = async (options = {}) => {
  return findAllIngredients(options);
};

export const getIngredient = async (id) => {
  const ingredient = await findIngredientById(id);
  if (!ingredient) {
    throw createError(404, '原料不存在');
  }
  return ingredient;
};

export const createIngredientRecord = async (payload, userId) => {
  // 检查编号是否已存在
  const existing = await findIngredientByCode(payload.code);
  if (existing) {
    throw createError(409, '编号已存在');
  }
  
  const id = await createIngredient(payload, userId);
  return findIngredientById(id);
};

export const updateIngredientRecord = async (id, payload, userId) => {
  const ingredient = await findIngredientById(id);
  if (!ingredient) {
    throw createError(404, '原料不存在');
  }
  
  // 如果编号改变，检查新编号是否已存在
  if (payload.code && payload.code !== ingredient.code) {
    const codeExists = await findIngredientByCode(payload.code);
    if (codeExists) {
      throw createError(409, '编号已存在');
    }
  }
  
  return updateIngredient(id, payload, userId);
};

export const removeIngredient = async (id) => {
  const ingredient = await findIngredientById(id);
  if (!ingredient) {
    throw createError(404, '原料不存在');
  }
  
  await deleteIngredient(id);
};


