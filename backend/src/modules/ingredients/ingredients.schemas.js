import Joi from 'joi';

export const createIngredientSchema = Joi.object({
  code: Joi.string().max(50).required().messages({
    'string.empty': '编号不能为空',
    'any.required': '编号为必填项'
  }),
  category: Joi.string().max(100).required().messages({
    'string.empty': '类别不能为空',
    'any.required': '类别为必填项'
  }),
  name: Joi.string().max(100).required().messages({
    'string.empty': '项目名称不能为空',
    'any.required': '项目名称为必填项'
  }),
  brand: Joi.string().max(200).allow('', null),
  source: Joi.string().max(200).allow('', null), // 采购渠道
  cost: Joi.number().min(0).allow(null),
  quantity: Joi.number().min(0).allow(null),
  unit: Joi.string().max(20).default('g'),
  pricePer500: Joi.number().min(0).allow(null),
  ediblePortion: Joi.number().min(0).max(1).default(1.0),
  ediblePricePer500: Joi.number().min(0).allow(null),
  weightPerUnit: Joi.number().min(0).allow(null),
  classification: Joi.string().max(100).allow('', null), // 预留字段
  description: Joi.string().allow('', null),
  mainFunction: Joi.string().allow('', null),
  // 新增字段
  subject: Joi.string().max(200).allow('', null), // 所属科目（仅食材）
  part: Joi.string().max(200).allow('', null), // 部位（仅食材）
  originType: Joi.string().max(200).allow('', null), // 产地类型（仅食材）
  model: Joi.string().max(200).allow('', null), // 型号（所有分类）
  unitContent: Joi.string().max(200).allow('', null) // 每单位含量（仅营养补充剂）
});

export const updateIngredientSchema = Joi.object({
  code: Joi.string().max(50).messages({
    'string.empty': '编号不能为空'
  }),
  category: Joi.string().max(100).messages({
    'string.empty': '类别不能为空'
  }),
  name: Joi.string().max(100).messages({
    'string.empty': '项目名称不能为空'
  }),
  brand: Joi.string().max(200).allow('', null),
  source: Joi.string().max(200).allow('', null), // 采购渠道
  cost: Joi.number().min(0).allow(null),
  quantity: Joi.number().min(0).allow(null),
  unit: Joi.string().max(20),
  pricePer500: Joi.number().min(0).allow(null),
  ediblePortion: Joi.number().min(0).max(1).allow(null),
  ediblePricePer500: Joi.number().min(0).allow(null),
  weightPerUnit: Joi.number().min(0).allow(null),
  classification: Joi.string().max(100).allow('', null),
  description: Joi.string().allow('', null),
  mainFunction: Joi.string().allow('', null),
  // 新增字段
  subject: Joi.string().max(200).allow('', null), // 所属科目（仅食材）
  part: Joi.string().max(200).allow('', null), // 部位（仅食材）
  originType: Joi.string().max(200).allow('', null), // 产地类型（仅食材）
  model: Joi.string().max(200).allow('', null), // 型号（所有分类）
  unitContent: Joi.string().max(200).allow('', null) // 每单位含量（仅营养补充剂）
}).min(1).messages({
  'object.min': '至少需要提供一个要更新的字段'
});

export const listIngredientsQuerySchema = Joi.object({
  search: Joi.string().max(200).allow(''),
  category: Joi.string().max(100).allow(''),
  classification: Joi.string().max(100).allow(''),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(1000).default(20)
});




