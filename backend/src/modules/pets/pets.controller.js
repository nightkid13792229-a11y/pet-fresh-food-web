import { success } from '../../utils/response.js';
import { createPet, listPetsByUser, removePet, updatePet, listAllPets, createPetAsAdmin, updatePetAsAdmin, removePetAsAdmin } from './pets.service.js';

export const listCustomerPets = async (req, res) => {
  const pets = await listPetsByUser(req.user.id);
  return success(res, pets);
};

export const createCustomerPet = async (req, res) => {
  try {
    const result = await createPet(req.user.id, req.body);
    return success(res, result, 201);
  } catch (error) {
    console.error('createCustomerPet error:', error);
    throw error;
  }
};

export const updateCustomerPet = async (req, res) => {
  const result = await updatePet(req.user.id, Number(req.params.id), req.body);
  return success(res, result);
};

export const deleteCustomerPet = async (req, res) => {
  const profileCompleted = await removePet(req.user.id, Number(req.params.id));
  return success(res, { profileCompleted });
};

// 管理员端：获取所有宠物信息
export const listAllPetsController = async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page, 10) || 1,
      pageSize: parseInt(req.query.pageSize, 10) || 50,
      search: req.query.search || undefined
    };
    const result = await listAllPets(options);
    return success(res, result);
  } catch (error) {
    console.error('listAllPetsController error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// 管理员端：创建宠物信息
export const createPetAsAdminController = async (req, res) => {
  try {
    const result = await createPetAsAdmin(req.body);
    return success(res, result, 201);
  } catch (error) {
    console.error('createPetAsAdminController error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// 管理员端：更新宠物信息
export const updatePetAsAdminController = async (req, res) => {
  try {
    const result = await updatePetAsAdmin(Number(req.params.id), req.body);
    return success(res, result);
  } catch (error) {
    console.error('updatePetAsAdminController error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// 管理员端：删除宠物信息
export const deletePetAsAdminController = async (req, res) => {
  try {
    const result = await removePetAsAdmin(Number(req.params.id));
    return success(res, result);
  } catch (error) {
    console.error('deletePetAsAdminController error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};
