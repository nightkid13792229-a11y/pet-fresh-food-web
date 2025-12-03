import Joi from 'joi';

// 食材项验证
// 注意：现在只保存 ingredientName，不保存 ingredientId
const ingredientItemSchema = Joi.object({
  ingredientName: Joi.string().max(120).required().messages({
    'string.empty': '食材名称不能为空',
    'any.required': '食材名称为必填项'
  }),
  weight: Joi.number().min(0).required(),
  unit: Joi.string().max(12).default('g')
});

// 制作步骤验证
const cookingStepSchema = Joi.object({
  stepOrder: Joi.number().integer().min(1).optional(),
  description: Joi.string().required()
});

export const createRecipeSchema = Joi.object({
  code: Joi.string().max(50).allow('', null),
  name: Joi.string().max(150).required().messages({
    'string.empty': '食谱名称不能为空',
    'any.required': '食谱名称为必填项'
  }),
  description: Joi.string().allow('', null),
  lifeStage: Joi.string().valid('puppy', 'adult', 'senior', 'pregnancy', 'lactation').allow('', null),
  recipeType: Joi.string().valid('standard', 'custom').default('standard'),
  software: Joi.string().valid('ADF', 'PDD').default('ADF'),
  nutritionStandard: Joi.string().valid('NRC', 'FEDIAF', 'AAFCO').default('FEDIAF'),
  cookingLoss: Joi.number().min(0).max(100).default(7.00),
  sellingPrice: Joi.number().min(0).allow(null),
  protein: Joi.number().min(0).max(100).allow(null),
  fat: Joi.number().min(0).max(100).allow(null),
  carb: Joi.number().min(0).max(100).allow(null),
  fiber: Joi.number().min(0).max(100).allow(null),
  ash: Joi.number().min(0).max(100).allow(null),
  moisture: Joi.number().min(0).max(100).allow(null),
  caRatio: Joi.string().pattern(/^[0-9]+(\.[0-9]+)?:[0-9]+(\.[0-9]+)?$/).allow('', null).messages({
    'string.pattern.base': '钙磷比格式不正确，请输入如 1.2:1 的格式'
  }),
  totalKcal: Joi.number().min(0).allow(null),
  totalWeight: Joi.number().min(0).allow(null),
  kcalDensity: Joi.number().min(0).allow(null),
  basePrice: Joi.number().min(0).allow(null),
  defaultServings: Joi.number().integer().min(1).allow(null),
  ingredients: Joi.array().items(ingredientItemSchema).optional(),
  cookingSteps: Joi.array().items(cookingStepSchema).optional()
});

export const updateRecipeSchema = Joi.object({
  code: Joi.string().max(50).allow('', null),
  name: Joi.string().max(150).messages({
    'string.empty': '食谱名称不能为空'
  }),
  description: Joi.string().allow('', null),
  lifeStage: Joi.string().valid('puppy', 'adult', 'senior', 'pregnancy', 'lactation').allow('', null),
  recipeType: Joi.string().valid('standard', 'custom'),
  software: Joi.string().valid('ADF', 'PDD'),
  nutritionStandard: Joi.string().valid('NRC', 'FEDIAF', 'AAFCO'),
  cookingLoss: Joi.number().min(0).max(100),
  sellingPrice: Joi.number().min(0).allow(null),
  protein: Joi.number().min(0).max(100).allow(null),
  fat: Joi.number().min(0).max(100).allow(null),
  carb: Joi.number().min(0).max(100).allow(null),
  fiber: Joi.number().min(0).max(100).allow(null),
  ash: Joi.number().min(0).max(100).allow(null),
  moisture: Joi.number().min(0).max(100).allow(null),
  caRatio: Joi.string().pattern(/^[0-9]+(\.[0-9]+)?:[0-9]+(\.[0-9]+)?$/).allow('', null).messages({
    'string.pattern.base': '钙磷比格式不正确，请输入如 1.2:1 的格式'
  }),
  totalKcal: Joi.number().min(0).allow(null),
  totalWeight: Joi.number().min(0).allow(null),
  kcalDensity: Joi.number().min(0).allow(null),
  basePrice: Joi.number().min(0).allow(null),
  defaultServings: Joi.number().integer().min(1).allow(null),
  ingredients: Joi.array().items(ingredientItemSchema).optional(),
  cookingSteps: Joi.array().items(cookingStepSchema).optional()
}).min(1).messages({
  'object.min': '至少需要提供一个要更新的字段'
});

export const listRecipesQuerySchema = Joi.object({
  search: Joi.string().max(200).allow(''),
  lifeStage: Joi.string().valid('puppy', 'adult', 'senior', 'pregnancy', 'lactation').allow(''),
  recipeType: Joi.string().valid('standard', 'custom').allow(''),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(1000).default(20)
});

