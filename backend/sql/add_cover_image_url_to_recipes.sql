-- 添加封面照片URL字段到recipes表
-- 执行时间: 2025-12-05

ALTER TABLE recipes 
ADD COLUMN cover_image_url VARCHAR(500) NULL COMMENT '食谱封面照片URL' 
AFTER description;

