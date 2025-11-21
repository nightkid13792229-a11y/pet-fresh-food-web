const { success } = require('../../utils/response');
const {
  listBreeds,
  getBreed,
  createBreedRecord,
  updateBreedRecord,
  removeBreed,
  listBreedCategories
} = require('./breeds.service');

const listBreedsController = async (req, res) => {
  console.log('>>> listBreedsController CALLED with req.path:', req.path);
  console.log('=== listBreedsController function definition loaded ===');
  console.log('listBreedsController called');
  try {
    const options = {
      category: req.query.category || undefined,
      sizeCategory: req.query.sizeCategory || undefined,
      search: req.query.search || undefined,
      page: parseInt(req.query.page, 10) || 1,
      pageSize: parseInt(req.query.pageSize, 10) || 100
    };
    const breeds = await listBreeds(options);
    console.log('listBreeds service called, result:', breeds ? 'success' : 'failed');
    return success(res, breeds);
  } catch (error) {
    console.error('listBreedsController error:', error ? error.message : 'Unknown error', error ? error.stack : 'No stack trace');
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

const getBreedController = async (req, res) => {
  try {
    const breed = await getBreed(req.params.id);
    return success(res, breed);
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

const createBreedController = async (req, res) => {
  try {
    const breed = await createBreedRecord(req.body);
    return success(res, breed, 201);
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

const updateBreedController = async (req, res) => {
  try {
    const breed = await updateBreedRecord(req.params.id, req.body);
    return success(res, breed);
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

const deleteBreedController = async (req, res) => {
  try {
    await removeBreed(req.params.id);
    return success(res, { message: 'Breed deleted successfully' });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

const listCategoriesController = async (req, res) => {
  try {
    const categories = await listBreedCategories();
    return success(res, categories);
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

module.exports = {
  listBreedsController,
  getBreedController,
  createBreedController,
  updateBreedController,
  deleteBreedController,
  listCategoriesController
};


