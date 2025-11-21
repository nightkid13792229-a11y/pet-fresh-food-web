import Joi from 'joi';

const sizeCategoryEnum = ['small', 'medium', 'large', 'xlarge'];

export const createBreedSchema = Joi.object({
  category: Joi.string().max(120).required().messages({
    'string.empty': '品种分类不能为空',
    'any.required': '品种分类为必填项'
  }),
  name: Joi.string().max(120).required().messages({
    'string.empty': '品种名称不能为空',
    'any.required': '品种名称为必填项'
  }),
  sizeCategory: Joi.string().valid(...sizeCategoryEnum).required().messages({
    'any.only': '体型分类必须是：small, medium, large, xlarge',
    'any.required': '体型分类为必填项'
  }),
  weightMin: Joi.number().min(0).max(200).allow(null).messages({
    'number.min': '体重最小值不能小于0',
    'number.max': '体重最小值不能大于200'
  }),
  weightMax: Joi.number().min(0).max(200).allow(null).messages({
    'number.min': '体重最大值不能小于0',
    'number.max': '体重最大值不能大于200'
  }),
  maturityMonths: Joi.number().integer().min(1).max(36).allow(null).messages({
    'number.min': '成熟月龄不能小于1',
    'number.max': '成熟月龄不能大于36',
    'number.integer': '成熟月龄必须是整数'
  })
}).custom((value, helpers) => {
  // Validate weight range
  if (value.weightMin !== null && value.weightMax !== null) {
    if (value.weightMin > value.weightMax) {
      return helpers.error('any.custom', {
        message: '体重最小值不能大于最大值'
      });
    }
  }
  return value;
});

export const updateBreedSchema = Joi.object({
  category: Joi.string().max(120).messages({
    'string.empty': '品种分类不能为空'
  }),
  name: Joi.string().max(120).messages({
    'string.empty': '品种名称不能为空'
  }),
  sizeCategory: Joi.string().valid(...sizeCategoryEnum).messages({
    'any.only': '体型分类必须是：small, medium, large, xlarge'
  }),
  weightMin: Joi.number().min(0).max(200).allow(null).messages({
    'number.min': '体重最小值不能小于0',
    'number.max': '体重最小值不能大于200'
  }),
  weightMax: Joi.number().min(0).max(200).allow(null).messages({
    'number.min': '体重最大值不能小于0',
    'number.max': '体重最大值不能大于200'
  }),
  maturityMonths: Joi.number().integer().min(1).max(36).allow(null).messages({
    'number.min': '成熟月龄不能小于1',
    'number.max': '成熟月龄不能大于36',
    'number.integer': '成熟月龄必须是整数'
  })
}).min(1).messages({
  'object.min': '至少需要提供一个要更新的字段'
}).custom((value, helpers) => {
  // Validate weight range if both are provided
  if (value.weightMin !== null && value.weightMax !== null) {
    if (value.weightMin > value.weightMax) {
      return helpers.error('any.custom', {
        message: '体重最小值不能大于最大值'
      });
    }
  }
  return value;
});

export const listBreedsQuerySchema = Joi.object({
  category: Joi.string().max(120).allow(''),
  sizeCategory: Joi.string().valid(...sizeCategoryEnum).allow(''),
  search: Joi.string().max(120).allow(''),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(1000).default(100)
});


