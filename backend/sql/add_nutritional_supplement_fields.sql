-- 添加营养补充剂专用字段到 ingredients 表
-- 执行时间：2024-11-28

-- 添加主要营养素字段
ALTER TABLE ingredients 
ADD COLUMN main_nutrient VARCHAR(200) NULL COMMENT '主要营养素（仅营养补充剂）' 
AFTER nutrient_unit;

-- 添加每100营养素单位价格字段
ALTER TABLE ingredients 
ADD COLUMN price_per_100_nutrient_unit DECIMAL(10, 4) NULL COMMENT '每100营养素单位价格（仅营养补充剂）' 
AFTER main_nutrient;

