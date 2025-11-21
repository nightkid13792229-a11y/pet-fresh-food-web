-- Create dog_breeds table for breed management

CREATE TABLE IF NOT EXISTS dog_breeds (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(120) NOT NULL COMMENT '品种分类',
  name VARCHAR(120) NOT NULL COMMENT '品种名称',
  size_category ENUM('small', 'medium', 'large', 'xlarge') NOT NULL COMMENT '体型分类：small=小型, medium=中型, large=大型, xlarge=超大型',
  weight_min DECIMAL(5,2) COMMENT '成年体重最小值（kg）',
  weight_max DECIMAL(5,2) COMMENT '成年体重最大值（kg）',
  maturity_months TINYINT UNSIGNED COMMENT '成熟月龄',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_category_name (category, name),
  INDEX idx_category (category),
  INDEX idx_size_category (size_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


