-- Ingredient Items table for PetFresh backend
-- 原料项目表（存储类别下的具体项目，如：小麦、大米等）

USE petfresh;

CREATE TABLE IF NOT EXISTS ingredient_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NOT NULL COMMENT '关联到ingredient_categories.id',
  name VARCHAR(100) NOT NULL COMMENT '项目名称（如：小麦、大米）',
  display_order INT DEFAULT 0 COMMENT '显示顺序',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT UNSIGNED COMMENT '创建人ID',
  updated_by BIGINT UNSIGNED COMMENT '最后更新人ID',
  
  UNIQUE KEY uk_category_name (category_id, name),
  INDEX idx_category_id (category_id),
  INDEX idx_display_order (display_order),
  FOREIGN KEY (category_id) REFERENCES ingredient_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='原料项目表';




