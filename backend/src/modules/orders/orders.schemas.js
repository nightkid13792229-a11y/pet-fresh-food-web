import Joi from 'joi';

const orderItemSchema = Joi.object({
  ingredientName: Joi.string().max(120).required(),
  unit: Joi.string().max(12).required(),
  quantity: Joi.number().precision(3).positive().required()
});

export const listOrdersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string()
    .valid('pending', 'paid', 'in_production', 'ready', 'shipped', 'completed', 'cancelled')
    .optional(),
  paymentStatus: Joi.string().valid('unpaid', 'paid', 'refunding', 'refunded').optional(),
  keyword: Joi.string().trim().optional()
});

export const listCustomerOrdersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string()
    .valid('pending', 'paid', 'in_production', 'ready', 'shipped', 'completed', 'cancelled')
    .optional()
});

export const createOrderSchema = Joi.object({
  orderNumber: Joi.string().optional(),
  customerId: Joi.number().integer().required(),
  petId: Joi.number().integer().required(),
  recipeId: Joi.number().integer().required(),
  productionDate: Joi.date().iso().required(),
  totalServings: Joi.number().integer().positive().required(),
  totalPrice: Joi.number().precision(2).required(),
  status: Joi.string()
    .valid('pending', 'paid', 'in_production', 'ready', 'shipped', 'completed', 'cancelled')
    .optional(),
  paymentStatus: Joi.string().valid('unpaid', 'paid', 'refunding', 'refunded').optional(),
  items: Joi.array().items(orderItemSchema).optional()
});

export const createCustomerOrderSchema = Joi.object({
  petId: Joi.number().integer().required(),
  recipeId: Joi.number().integer().required(),
  productionDate: Joi.date().iso().required(),
  totalServings: Joi.number().integer().positive().required(),
  totalPrice: Joi.number().precision(2).positive().required(),
  items: Joi.array().items(orderItemSchema).optional()
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'paid', 'in_production', 'ready', 'shipped', 'completed', 'cancelled')
    .optional(),
  paymentStatus: Joi.string().valid('unpaid', 'paid', 'refunding', 'refunded').optional()
}).or('status', 'paymentStatus');

export const updateOrderSchema = Joi.object({
  customerId: Joi.number().integer().optional(),
  petId: Joi.number().integer().optional(),
  recipeId: Joi.number().integer().optional(),
  productionDate: Joi.date().iso().optional(),
  totalServings: Joi.number().integer().positive().optional(),
  totalPrice: Joi.number().precision(2).optional(),
  status: Joi.string()
    .valid('pending', 'paid', 'in_production', 'ready', 'shipped', 'completed', 'cancelled')
    .optional(),
  paymentStatus: Joi.string().valid('unpaid', 'paid', 'refunding', 'refunded').optional(),
  items: Joi.array().items(orderItemSchema).optional()
}).or(
  'customerId',
  'petId',
  'recipeId',
  'productionDate',
  'totalServings',
  'totalPrice',
  'status',
  'paymentStatus',
  'items'
);


