import { success } from '../../utils/response.js';
import { createPet, listPetsByUser, removePet, updatePet } from './pets.service.js';

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
