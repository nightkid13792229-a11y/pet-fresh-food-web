import { query } from '../../db/pool.js';

const baseSelect = `
  SELECT
    r.id,
    r.name,
    r.description,
    r.life_stage AS lifeStage,
    r.recipe_type AS recipeType,
    r.base_price AS basePrice,
    r.default_servings AS defaultServings,
    r.created_at AS createdAt,
    r.updated_at AS updatedAt
  FROM recipes r
`;

export const listRecipes = async () => {
  return query(`${baseSelect} ORDER BY r.name ASC`);
};

export const getRecipeById = async (id) => {
  const rows = await query(`${baseSelect} WHERE r.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};



