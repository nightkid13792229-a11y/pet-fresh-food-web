-- Ingredient Categories table for PetFresh backend
-- 原料分类表

USE petfresh;

CREATE TABLE IF NOT EXISTS ingredient_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  classification VARCHAR(100) NOT NULL COMMENT '原料分类（食材、营养补充剂、包材）',
  category VARCHAR(100) NOT NULL COMMENT '类别名称',
  display_order INT DEFAULT 0 COMMENT '显示顺序',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT UNSIGNED COMMENT '创建人ID',
  updated_by BIGINT UNSIGNED COMMENT '最后更新人ID',
  
  UNIQUE KEY uk_classification_category (classification, category),
  INDEX idx_classification (classification),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='原料分类表';




