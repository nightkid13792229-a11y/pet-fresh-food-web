import Joi from 'joi';

const classificationEnum = ['食材', '营养补充剂', '包材'];

export const createCategorySchema = Joi.object({
  classification: Joi.string().valid(...classificationEnum).required().messages({
    'any.only': '原料分类必须是：食材、营养补充剂、包材',
    'any.required': '原料分类为必填项'
  }),
  category: Joi.string().max(100).required().messages({
    'string.empty': '类别名称不能为空',
    'any.required': '类别名称为必填项'
  }),
  displayOrder: Joi.number().integer().min(0).allow(null).messages({
    'number.min': '显示顺序不能小于0',
    'number.integer': '显示顺序必须是整数'
  })
});

export const updateCategorySchema = Joi.object({
  classification: Joi.string().valid(...classificationEnum).messages({
    'any.only': '原料分类必须是：食材、营养补充剂、包材'
  }),
  category: Joi.string().max(100).messages({
    'string.empty': '类别名称不能为空'
  }),
  displayOrder: Joi.number().integer().min(0).allow(null).messages({
    'number.min': '显示顺序不能小于0',
    'number.integer': '显示顺序必须是整数'
  })
}).min(1).messages({
  'object.min': '至少需要提供一个要更新的字段'
});

export const listCategoriesQuerySchema = Joi.object({
  classification: Joi.string().valid(...classificationEnum).allow(''),
  search: Joi.string().max(200).allow(''),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(1000).default(1000)
});

export const importPresetCategoriesSchema = Joi.object({
  categories: Joi.array().items(
    Joi.object({
      classification: Joi.string().valid(...classificationEnum).required(),
      category: Joi.string().max(100).required(),
      displayOrder: Joi.number().integer().min(0).allow(null)
    })
  ).min(1).required().messages({
    'array.min': '至少需要提供一个分类',
    'any.required': '分类数组为必填项'
  })
});




