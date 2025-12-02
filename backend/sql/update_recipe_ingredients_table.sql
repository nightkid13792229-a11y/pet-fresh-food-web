-- 更新recipe_ingredients表结构
-- 执行时间：2024-12-02
-- 注意：如果字段已存在，会报错但可以忽略

-- 添加ingredient_id字段（关联ingredients表）
ALTER TABLE recipe_ingredients 
ADD COLUMN ingredient_id BIGINT UNSIGNED NULL COMMENT '原料ID（关联ingredients表）' 
AFTER recipe_id;

-- 添加weight字段（重量，单位：g）
ALTER TABLE recipe_ingredients 
ADD COLUMN weight DECIMAL(10,3) NULL COMMENT '重量（g）' 
AFTER ingredient_id;

-- 确保unit字段存在（如果不存在则添加）
ALTER TABLE recipe_ingredients 
ADD COLUMN unit VARCHAR(12) NULL DEFAULT 'g' COMMENT '单位' 
AFTER weight;

-- 添加索引（如果不存在会报错，可以忽略）
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);

-- 注意：如果需要添加外键约束，请先确保数据完整性
-- ALTER TABLE recipe_ingredients 
-- ADD CONSTRAINT fk_recipe_ingredients_ingredient 
-- FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE SET NULL;
