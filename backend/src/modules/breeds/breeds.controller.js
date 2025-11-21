import { success } from '../../utils/response.js';
import {
  listBreeds,
  getBreed,
  createBreedRecord,
  updateBreedRecord,
  removeBreed,
  listBreedCategories
} from './breeds.service.js';

export const listBreedsController = async (req, res) => {
  const options = {
    category: req.query.category || undefined,
    sizeCategory: req.query.sizeCategory || undefined,
    search: req.query.search || undefined,
    page: parseInt(req.query.page, 10) || 1,
    pageSize: parseInt(req.query.pageSize, 10) || 100
  };
  const breeds = await listBreeds(options);
  return success(res, breeds);
};

export const getBreedController = async (req, res) => {
  const breed = await getBreed(req.params.id);
  return success(res, breed);
};

export const createBreedController = async (req, res) => {
  const breed = await createBreedRecord(req.body);
  return success(res, breed, 201);
};

export const updateBreedController = async (req, res) => {
  const breed = await updateBreedRecord(req.params.id, req.body);
  return success(res, breed);
};

export const deleteBreedController = async (req, res) => {
  await removeBreed(req.params.id);
  return success(res, { message: 'Breed deleted successfully' });
};

export const listCategoriesController = async (req, res) => {
  const categories = await listBreedCategories();
  return success(res, categories);
};


