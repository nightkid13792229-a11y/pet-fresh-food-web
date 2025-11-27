-- 为 ingredients 表添加新字段
-- 执行时间：2024-11-27

-- 添加所属科目字段（仅食材）
ALTER TABLE ingredients 
ADD COLUMN subject VARCHAR(200) NULL COMMENT '所属科目（仅食材）';

-- 添加部位字段（仅食材）
ALTER TABLE ingredients 
ADD COLUMN part VARCHAR(200) NULL COMMENT '部位（仅食材）';

-- 添加产地类型字段（仅食材）
ALTER TABLE ingredients 
ADD COLUMN origin_type VARCHAR(200) NULL COMMENT '产地类型（仅食材）';

-- 添加型号字段（所有分类）
ALTER TABLE ingredients 
ADD COLUMN model VARCHAR(200) NULL COMMENT '型号（所有分类）';

-- 添加每单位含量字段（仅营养补充剂）
ALTER TABLE ingredients 
ADD COLUMN unit_content VARCHAR(200) NULL COMMENT '每单位含量（仅营养补充剂）';

