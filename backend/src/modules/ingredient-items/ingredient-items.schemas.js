import Joi from 'joi';

export const createItemSchema = Joi.object({
  categoryId: Joi.number().integer().positive().required().messages({
    'number.base': '类别ID必须是数字',
    'number.integer': '类别ID必须是整数',
    'number.positive': '类别ID必须是正数',
    'any.required': '类别ID为必填项'
  }),
  name: Joi.string().max(100).required().messages({
    'string.empty': '项目名称不能为空',
    'any.required': '项目名称为必填项'
  }),
  displayOrder: Joi.number().integer().min(0).allow(null).messages({
    'number.min': '显示顺序不能小于0',
    'number.integer': '显示顺序必须是整数'
  })
});

export const updateItemSchema = Joi.object({
  categoryId: Joi.number().integer().positive().messages({
    'number.base': '类别ID必须是数字',
    'number.integer': '类别ID必须是整数',
    'number.positive': '类别ID必须是正数'
  }),
  name: Joi.string().max(100).messages({
    'string.empty': '项目名称不能为空'
  }),
  displayOrder: Joi.number().integer().min(0).allow(null).messages({
    'number.min': '显示顺序不能小于0',
    'number.integer': '显示顺序必须是整数'
  })
}).min(1).messages({
  'object.min': '至少需要提供一个要更新的字段'
});

export const listItemsQuerySchema = Joi.object({
  categoryId: Joi.number().integer().positive().allow(''),
  classification: Joi.string().max(100).allow(''),
  category: Joi.string().max(100).allow(''),
  search: Joi.string().max(200).allow(''),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(1000).default(1000)
});

export const importPresetItemsSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      categoryId: Joi.number().integer().positive().required(),
      name: Joi.string().max(100).required(),
      displayOrder: Joi.number().integer().min(0).allow(null)
    })
  ).min(1).required().messages({
    'array.min': '至少需要提供一个项目',
    'any.required': '项目数组为必填项'
  })
});




