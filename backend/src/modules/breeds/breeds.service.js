import createError from 'http-errors';
import {
  findAllBreeds,
  findBreedById,
  findBreedByCategoryAndName,
  createBreed,
  updateBreed,
  deleteBreed,
  getBreedCategories
} from './breeds.repository.js';

export const listBreeds = async (options = {}) => {
  return findAllBreeds(options);
};

export const getBreed = async (id) => {
  const breed = await findBreedById(id);
  if (!breed) {
    throw createError(404, 'Breed not found');
  }
  return breed;
};

export const createBreedRecord = async (payload) => {
  // Check if breed with same category and name already exists
  const existing = await findBreedByCategoryAndName(payload.category, payload.name);
  if (existing) {
    throw createError(409, 'Breed with this category and name already exists');
  }

  return createBreed(payload);
};

export const updateBreedRecord = async (id, payload) => {
  const breed = await findBreedById(id);
  if (!breed) {
    throw createError(404, 'Breed not found');
  }

  // If category or name is being updated, check for duplicates
  if (payload.category || payload.name) {
    const newCategory = payload.category || breed.category;
    const newName = payload.name || breed.name;
    const existing = await findBreedByCategoryAndName(newCategory, newName);
    if (existing && existing.id !== id) {
      throw createError(409, 'Breed with this category and name already exists');
    }
  }

  return updateBreed(id, payload);
};

export const removeBreed = async (id) => {
  const breed = await findBreedById(id);
  if (!breed) {
    throw createError(404, 'Breed not found');
  }

  const deleted = await deleteBreed(id);
  if (!deleted) {
    throw createError(500, 'Failed to delete breed');
  }

  return true;
};

export const listBreedCategories = async () => {
  return getBreedCategories();
};


