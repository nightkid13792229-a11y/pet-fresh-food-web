import createError from 'http-errors';
import {
  createPetProfile,
  deletePetProfile,
  findPetById,
  findPetsByUserId,
  updatePetProfile
} from './pets.repository.js';
import { isProfileCompleted } from '../profile/profile.service.js';

export const listPetsByUser = async (userId) => {
  return findPetsByUserId(userId);
};

export const createPet = async (userId, payload) => {
  const insertId = await createPetProfile({ userId, ...payload });
  const pet = await findPetById(insertId);
  const profileCompleted = await isProfileCompleted(userId);
  return { pet, profileCompleted };
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
  const deleted = await deletePetProfile(petId);
  if (!deleted) {
    throw createError(500, 'Failed to delete pet profile');
  }
  const profileCompleted = await isProfileCompleted(userId);
  return profileCompleted;
};
