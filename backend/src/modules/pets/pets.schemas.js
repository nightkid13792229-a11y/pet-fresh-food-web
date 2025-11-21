import Joi from 'joi';

export const petSchema = Joi.object({
  name: Joi.string().max(120).required(),
  breed: Joi.string().max(120).allow('', null),
  city: Joi.string().max(120).allow('', null),
  birthdate: Joi.date().iso().allow(null, ''),
  weightKg: Joi.number().precision(2).positive().allow(null),
  sex: Joi.string().valid('male', 'female', 'unknown').default('unknown'),
  neutered: Joi.boolean().default(false),
  lifeStage: Joi.string().max(60).allow('', null),
  activityLevel: Joi.string().max(60).allow('', null),
  energyMultiplier: Joi.number().precision(2).allow(null),
  dailyEnergyKcal: Joi.number().integer().allow(null),
  bodyConditionScore: Joi.number().integer().min(1).max(9).allow(null),
  mealsPerDay: Joi.number().integer().min(1).max(10).allow(null),
  snackAmount: Joi.string().max(120).allow('', null),
  dietaryNote: Joi.string().allow('', null),
  allergyNote: Joi.string().allow('', null),
  symptomNote: Joi.string().allow('', null),
  notes: Joi.string().allow('', null)
});

export const createPetSchema = petSchema;

export const updatePetSchema = petSchema.min(1);



