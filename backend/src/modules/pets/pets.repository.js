import { query } from '../../db/pool.js';

const baseSelect = `
  SELECT
    id,
    user_id AS userId,
    name,
    breed,
    city,
    birthdate,
    weight_kg AS weightKg,
    sex,
    neutered,
    life_stage AS lifeStage,
    activity_level AS activityLevel,
    energy_multiplier AS energyMultiplier,
    daily_energy_kcal AS dailyEnergyKcal,
    body_condition_score AS bodyConditionScore,
    meals_per_day AS mealsPerDay,
    snack_amount AS snackAmount,
    dietary_note AS dietaryNote,
    allergy_note AS allergyNote,
    symptom_note AS symptomNote,
    notes,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM pet_profiles
`;

export const findPetById = async (id) => {
  const sql = `${baseSelect} WHERE id = ? LIMIT 1`;
  const rows = await query(sql, [id]);
  return rows[0] || null;
};

export const findPetsByUserId = async (userId) => {
  const sql = `${baseSelect} WHERE user_id = ? ORDER BY created_at DESC`;
  return query(sql, [userId]);
};

export const createPetProfile = async (payload) => {
  const sql = `
    INSERT INTO pet_profiles (
      user_id,
      name,
      breed,
      city,
      birthdate,
      weight_kg,
      sex,
      neutered,
      life_stage,
      activity_level,
      energy_multiplier,
      daily_energy_kcal,
      body_condition_score,
      meals_per_day,
      snack_amount,
      dietary_note,
      allergy_note,
      symptom_note,
      notes,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;
  const result = await query(sql, [
    payload.userId,
    payload.name,
    payload.breed,
    payload.city,
    payload.birthdate,
    payload.weightKg,
    payload.sex || 'unknown',
    payload.neutered ? 1 : 0,
    payload.lifeStage,
    payload.activityLevel,
    payload.energyMultiplier,
    payload.dailyEnergyKcal,
    payload.bodyConditionScore,
    payload.mealsPerDay,
    payload.snackAmount,
    payload.dietaryNote,
    payload.allergyNote,
    payload.symptomNote,
    payload.notes
  ]);
  return result.insertId;
};

export const updatePetProfile = async (id, fields) => {
  const updates = [];
  const params = [];

  const mapping = {
    name: 'name',
    breed: 'breed',
    city: 'city',
    birthdate: 'birthdate',
    weightKg: 'weight_kg',
    sex: 'sex',
    neutered: 'neutered',
    lifeStage: 'life_stage',
    activityLevel: 'activity_level',
    energyMultiplier: 'energy_multiplier',
    dailyEnergyKcal: 'daily_energy_kcal',
    bodyConditionScore: 'body_condition_score',
    mealsPerDay: 'meals_per_day',
    snackAmount: 'snack_amount',
    dietaryNote: 'dietary_note',
    allergyNote: 'allergy_note',
    symptomNote: 'symptom_note',
    notes: 'notes'
  };

  Object.entries(mapping).forEach(([key, column]) => {
    if (fields[key] !== undefined) {
      updates.push(`${column} = ?`);
      if (key === 'neutered') {
        params.push(fields[key] ? 1 : 0);
      } else {
        params.push(fields[key]);
      }
    }
  });

  if (!updates.length) {
    return false;
  }

  const sql = `
    UPDATE pet_profiles
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE id = ?
  `;
  params.push(id);
  const result = await query(sql, params);
  return result.affectedRows > 0;
};

export const deletePetProfile = async (id) => {
  const sql = 'DELETE FROM pet_profiles WHERE id = ? LIMIT 1';
  const result = await query(sql, [id]);
  return result.affectedRows > 0;
};
