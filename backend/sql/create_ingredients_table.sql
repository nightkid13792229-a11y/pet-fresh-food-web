-- Ingredients table for PetFresh backend
-- 原料表

CREATE TABLE IF NOT EXISTS ingredients (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE COMMENT '编号',
  category VARCHAR(100) NOT NULL COMMENT '类别（如：种子、鱼肉、营养品等）',
  name VARCHAR(100) NOT NULL COMMENT '项目/名称',
  brand VARCHAR(200) COMMENT '品牌/来源',
  
  -- 采购相关字段
  cost DECIMAL(10, 2) COMMENT '费用（采购价格）',
  quantity DECIMAL(10, 2) COMMENT '单量（采购数量）',
  unit VARCHAR(20) DEFAULT 'g' COMMENT '单位',
  
  -- 价格计算字段
  price_per_500 DECIMAL(10, 2) COMMENT '单价/500单位',
  edible_portion DECIMAL(5, 2) DEFAULT 1.00 COMMENT '可食部（0-1，存储为小数）',
  edible_price_per_500 DECIMAL(10, 2) COMMENT '可食部单价/500单位',
  weight_per_unit DECIMAL(10, 2) COMMENT '每单位重量(g)',
  
  -- 分类字段（预留，暂时可为空）
  classification VARCHAR(100) COMMENT '分类（如：肉类、蔬菜、包装材料、调料等）',
  
  -- 描述字段
  description TEXT COMMENT '说明',
  main_function TEXT COMMENT '主要作用',
  
  -- 时间戳和用户追踪
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT UNSIGNED COMMENT '创建人ID',
  updated_by BIGINT UNSIGNED COMMENT '最后更新人ID',
  
  INDEX idx_category (category),
  INDEX idx_name (name),
  INDEX idx_classification (classification),
  INDEX idx_code (code),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='原料表';


