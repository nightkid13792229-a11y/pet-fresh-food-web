import createError from 'http-errors';
import { findUserById, updateUserProfile } from '../users/users.repository.js';
import { findPetsByUserId } from '../pets/pets.repository.js';

export const isProfileCompleted = async (userId) => {
  const pets = await findPetsByUserId(userId);
  if (!pets.length) {
    return false;
  }
  return pets.some((pet) => pet.name && pet.weightKg);
};

export const getCustomerProfile = async (userId) => {
  const user = await findUserById(userId);
  if (!user) {
    throw createError(404, 'User not found');
  }
  const profileCompleted = await isProfileCompleted(userId);
  return {
    id: user.id,
    name: user.name,
    contactInfo: user.contactInfo || '',
    role: user.role,
    profileCompleted
  };
};

export const updateCustomerProfile = async (userId, { name, contactInfo }) => {
  const updated = await updateUserProfile(userId, { name, contactInfo });
  if (!updated) {
    throw createError(400, 'Failed to update profile or no changes provided');
  }
  return getCustomerProfile(userId);
};


