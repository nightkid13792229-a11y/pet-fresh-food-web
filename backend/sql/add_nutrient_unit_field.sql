-- 添加营养素单位字段到 ingredients 表
-- 执行时间：2024-11-28

ALTER TABLE ingredients 
ADD COLUMN nutrient_unit VARCHAR(20) NULL COMMENT '营养素单位（仅营养补充剂）' 
AFTER unit_content;

