const createError = require('http-errors');
const {
  findAllBreeds,
  findBreedById,
  findBreedByCategoryAndName,
  createBreed,
  updateBreed,
  deleteBreed,
  getBreedCategories
} = require('./breeds.repository');

const listBreeds = async (options = {}) => {
  return findAllBreeds(options);
};

const getBreed = async (id) => {
  const breed = await findBreedById(id);
  if (!breed) {
    throw createError(404, 'Breed not found');
  }
  return breed;
};

const createBreedRecord = async (payload) => {
  // Check if breed with same category and name already exists
  const existing = await findBreedByCategoryAndName(payload.category, payload.name);
  if (existing) {
    throw createError(409, 'Breed with this category and name already exists');
  }

  return createBreed(payload);
};

const updateBreedRecord = async (id, payload) => {
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

const removeBreed = async (id) => {
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

const listBreedCategories = async () => {
  return getBreedCategories();
};

module.exports = {
  listBreeds,
  getBreed,
  createBreedRecord,
  updateBreedRecord,
  removeBreed,
  listBreedCategories
};


