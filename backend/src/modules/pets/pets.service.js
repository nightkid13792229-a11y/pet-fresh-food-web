import createError from 'http-errors';
import {
  createPetProfile,
  deletePetProfile,
  findPetById,
  findPetsByUserId,
  updatePetProfile,
  findAllPetsWithUsers,
  hasOrdersByPetId
} from './pets.repository.js';
import { isProfileCompleted } from '../profile/profile.service.js';

export const listPetsByUser = async (userId) => {
  return findPetsByUserId(userId);
};

export const createPet = async (userId, payload) => {
  try {
    const insertId = await createPetProfile({ userId, ...payload });
    if (!insertId) {
      throw createError(500, 'Failed to create pet profile: no insertId returned');
    }
    const pet = await findPetById(insertId);
    if (!pet) {
      throw createError(500, 'Failed to retrieve created pet profile');
    }
    const profileCompleted = await isProfileCompleted(userId);
    return { pet, profileCompleted };
  } catch (error) {
    // 记录详细错误信息
    if (error instanceof createError.HttpError) {
      throw error;
    }
    console.error('createPet error:', error);
    throw createError(500, `Failed to create pet: ${error.message}`);
  }
};

export const updatePet = async (userId, petId, payload) => {
  const existing = await findPetById(petId);
  if (!existing || existing.userId !== userId) {
    throw createError(404, 'Pet not found');
  }
  const updated = await updatePetProfile(petId, payload);
  if (!updated) {
    throw createError(400, 'No changes provided');
  }
  const pet = await findPetById(petId);
  const profileCompleted = await isProfileCompleted(userId);
  return { pet, profileCompleted };
};

export const removePet = async (userId, petId) => {
  const existing = await findPetById(petId);
  if (!existing || existing.userId !== userId) {
    throw createError(404, 'Pet not found');
  }
  
  // 检查是否有关联订单
  const hasOrders = await hasOrdersByPetId(petId);
  if (hasOrders) {
    throw createError(400, '无法删除该宠物：该宠物有关联的订单记录。请先删除或处理相关订单后再试。');
  }
  
  const deleted = await deletePetProfile(petId);
  if (!deleted) {
    throw createError(500, 'Failed to delete pet profile');
  }
  const profileCompleted = await isProfileCompleted(userId);
  return profileCompleted;
};

// 管理员端：获取所有宠物信息
export const listAllPets = async (options) => {
  return findAllPetsWithUsers(options);
};

// 管理员端：创建宠物信息
export const createPetAsAdmin = async (payload) => {
  try {
    // 管理员可以指定userId，如果没有指定则使用payload中的userId
    const userId = payload.userId;
    if (!userId) {
      throw createError(400, 'userId is required for admin pet creation');
    }
    const insertId = await createPetProfile({ userId, ...payload });
    if (!insertId) {
      throw createError(500, 'Failed to create pet profile: no insertId returned');
    }
    const pet = await findPetById(insertId);
    if (!pet) {
      throw createError(500, 'Failed to retrieve created pet profile');
    }
    return { pet };
  } catch (error) {
    if (error instanceof createError.HttpError) {
      throw error;
    }
    console.error('createPetAsAdmin error:', error);
    throw createError(500, `Failed to create pet: ${error.message}`);
  }
};

// 管理员端：更新宠物信息
export const updatePetAsAdmin = async (petId, payload) => {
  const existing = await findPetById(petId);
  if (!existing) {
    throw createError(404, 'Pet not found');
  }
  const updated = await updatePetProfile(petId, payload);
  if (!updated) {
    throw createError(400, 'No changes provided');
  }
  const pet = await findPetById(petId);
  return { pet };
};

// 管理员端：删除宠物信息
export const removePetAsAdmin = async (petId) => {
  const existing = await findPetById(petId);
  if (!existing) {
    throw createError(404, 'Pet not found');
  }
  
  // 检查是否有关联订单
  const hasOrders = await hasOrdersByPetId(petId);
  if (hasOrders) {
    throw createError(400, '无法删除该宠物：该宠物有关联的订单记录。请先删除或处理相关订单后再试。');
  }
  
  const deleted = await deletePetProfile(petId);
  if (!deleted) {
    throw createError(500, 'Failed to delete pet profile');
  }
  return { deleted: true };
};
