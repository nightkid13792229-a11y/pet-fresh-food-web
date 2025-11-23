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
  // query 对于非 INSERT 操作返回数组
  return Array.isArray(rows) ? (rows[0] || null) : rows;
};

export const findPetsByUserId = async (userId) => {
  const sql = `${baseSelect} WHERE user_id = ? ORDER BY created_at DESC`;
  const rows = await query(sql, [userId]);
  // query 对于非 INSERT 操作返回数组
  return Array.isArray(rows) ? rows : [rows];
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
  try {
    // 确保所有参数都是 null 而不是 undefined（MySQL2 不允许 undefined）
    const params = [
      payload.userId,
      payload.name,
      payload.breed !== undefined ? payload.breed : null,
      payload.city !== undefined ? payload.city : null,
      payload.birthdate !== undefined ? payload.birthdate : null,
      payload.weightKg !== undefined ? payload.weightKg : null,
      payload.sex !== undefined ? payload.sex : 'unknown',
      payload.neutered ? 1 : 0,
      payload.lifeStage !== undefined ? payload.lifeStage : null,
      payload.activityLevel !== undefined ? payload.activityLevel : null,
      payload.energyMultiplier !== undefined ? payload.energyMultiplier : null,
      payload.dailyEnergyKcal !== undefined ? payload.dailyEnergyKcal : null,
      payload.bodyConditionScore !== undefined ? payload.bodyConditionScore : null,
      payload.mealsPerDay !== undefined ? payload.mealsPerDay : null,
      payload.snackAmount !== undefined ? payload.snackAmount : null,
      payload.dietaryNote !== undefined ? payload.dietaryNote : null,
      payload.allergyNote !== undefined ? payload.allergyNote : null,
      payload.symptomNote !== undefined ? payload.symptomNote : null,
      payload.notes !== undefined ? payload.notes : null
    ];
    
    const result = await query(sql, params);
    
    // MySQL2 对于 INSERT 返回 ResultSetHeader，insertId 在 result 对象上
    const insertId = result.insertId;
    if (!insertId) {
      throw new Error(`Failed to get insertId from query result. Result: ${JSON.stringify(result)}`);
    }
    return insertId;
  } catch (error) {
    console.error('createPetProfile error:', error);
    console.error('SQL:', sql);
    console.error('Payload:', JSON.stringify(payload, null, 2));
    throw error;
  }
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
        // 确保所有参数都是 null 而不是 undefined（MySQL2 不允许 undefined）
        const value = fields[key] !== undefined ? fields[key] : null;
        params.push(value);
      }
    }
  });

  if (!updates.length) {
    return false;
  }

  try {
    const sql = `
      UPDATE pet_profiles
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = ?
    `;
    params.push(id);
    const result = await query(sql, params);
    // 对于 UPDATE，result 可能是 ResultSetHeader 或数组，需要检查 affectedRows
    const affectedRows = result.affectedRows || (Array.isArray(result) ? 0 : result.affectedRows);
    return affectedRows > 0;
  } catch (error) {
    console.error('updatePetProfile error:', error);
    console.error('Updates:', updates.join(', '));
    console.error('Fields:', JSON.stringify(fields, null, 2));
    throw error;
  }
};

export const deletePetProfile = async (id) => {
  const sql = 'DELETE FROM pet_profiles WHERE id = ? LIMIT 1';
  const result = await query(sql, [id]);
  return result.affectedRows > 0;
};

// 管理员端：获取所有宠物信息（带用户信息）
export const findAllPetsWithUsers = async (options = {}) => {
  // 确保参数是有效的数字，防止 NaN
  let page = parseInt(options.page, 10);
  if (isNaN(page) || page < 1) page = 1;
  
  let pageSize = parseInt(options.pageSize, 10);
  if (isNaN(pageSize) || pageSize < 1) pageSize = 50;
  if (pageSize > 100) pageSize = 100; // 限制最大100
  
  const search = options.search ? String(options.search).trim() : undefined;
  const offset = (page - 1) * pageSize;
  
  // 确保 offset 也是有效数字
  if (isNaN(offset) || offset < 0) {
    throw new Error(`Invalid offset calculated: page=${page}, pageSize=${pageSize}, offset=${offset}`);
  }
  
  let sql = `
    SELECT
      pp.id,
      pp.user_id AS userId,
      pp.name,
      pp.breed,
      pp.city,
      pp.birthdate,
      pp.weight_kg AS weightKg,
      pp.sex,
      pp.neutered,
      pp.life_stage AS lifeStage,
      pp.activity_level AS activityLevel,
      pp.energy_multiplier AS energyMultiplier,
      pp.daily_energy_kcal AS dailyEnergyKcal,
      pp.body_condition_score AS bodyConditionScore,
      pp.meals_per_day AS mealsPerDay,
      pp.snack_amount AS snackAmount,
      pp.dietary_note AS dietaryNote,
      pp.allergy_note AS allergyNote,
      pp.symptom_note AS symptomNote,
      pp.notes,
      pp.created_at AS createdAt,
      pp.updated_at AS updatedAt,
      u.name AS userName,
      u.email AS userEmail,
      u.contact_info AS userContactInfo,
      u.wechat_openid AS userWeChatOpenId
    FROM pet_profiles pp
    LEFT JOIN users u ON pp.user_id = u.id
  `;
  
  const params = [];
  
  if (search) {
    sql += ` WHERE (
      pp.name LIKE ? OR 
      pp.breed LIKE ? OR 
      u.name LIKE ? OR 
      u.email LIKE ? OR 
      u.contact_info LIKE ?
    )`;
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
  }
  
  sql += ` ORDER BY pp.created_at DESC LIMIT ? OFFSET ?`;
  // 确保参数是整数（不是 NaN），使用 Math.floor 确保是整数
  params.push(Math.floor(pageSize), Math.floor(offset));
  
  try {
    console.log('[findAllPetsWithUsers] SQL params:', { page, pageSize, offset, search, paramsLength: params.length });
    const rows = await query(sql, params);
    const pets = Array.isArray(rows) ? rows : (rows ? [rows] : []);
  
  // 获取总数
  let countSql = `
    SELECT COUNT(*) as total
    FROM pet_profiles pp
    LEFT JOIN users u ON pp.user_id = u.id
  `;
  const countParams = [];
  
  if (search) {
    countSql += ` WHERE (
      pp.name LIKE ? OR 
      pp.breed LIKE ? OR 
      u.name LIKE ? OR 
      u.email LIKE ? OR 
      u.contact_info LIKE ?
    )`;
    const searchPattern = `%${search}%`;
    countParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
  }
  
    const countRows = await query(countSql, countParams);
    const total = Array.isArray(countRows) ? (countRows[0]?.total || 0) : (countRows?.total || 0);
    
    return {
      items: pets,
      total: parseInt(total, 10) || 0,
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil((parseInt(total, 10) || 0) / pageSize) || 1
    };
  } catch (error) {
    console.error('findAllPetsWithUsers error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    console.error('Params types:', params.map(p => typeof p));
    console.error('Params values:', params);
    throw error;
  }
};
