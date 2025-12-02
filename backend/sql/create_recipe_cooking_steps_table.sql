-- 创建recipe_cooking_steps表（食谱制作步骤）
-- 执行时间：2024-12-02

CREATE TABLE IF NOT EXISTS recipe_cooking_steps (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  recipe_id BIGINT UNSIGNED NOT NULL COMMENT '食谱ID（关联recipes表）',
  step_order INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '步骤顺序',
  description TEXT NOT NULL COMMENT '步骤描述',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_recipe_cooking_steps_recipe_id (recipe_id),
  INDEX idx_recipe_cooking_steps_order (recipe_id, step_order),
  CONSTRAINT fk_recipe_cooking_steps_recipe 
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='食谱制作步骤表';

