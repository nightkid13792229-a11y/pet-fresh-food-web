import Joi from 'joi';

export const createAddressSchema = Joi.object({
  contactName: Joi.string().max(60).required(),
  contactPhone: Joi.string().max(30).required(),
  region: Joi.string().max(120).allow('', null),
  detail: Joi.string().max(255).required(),
  isDefault: Joi.boolean().optional()
});

export const updateAddressSchema = Joi.object({
  contactName: Joi.string().max(60).optional(),
  contactPhone: Joi.string().max(30).optional(),
  region: Joi.string().max(120).allow('', null),
  detail: Joi.string().max(255).optional(),
  isDefault: Joi.boolean().optional()
}).min(1);



