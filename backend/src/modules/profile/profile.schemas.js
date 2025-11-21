import Joi from 'joi';

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(120).optional(),
  contactInfo: Joi.string().max(60).optional().allow('')
}).min(1); // 至少一个字段用于更新


