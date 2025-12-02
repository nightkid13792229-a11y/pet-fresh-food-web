-- 更新recipes表，添加缺失字段
-- 执行时间：2024-12-02
-- 注意：如果字段已存在，会报错但可以忽略

-- 添加食谱编号
ALTER TABLE recipes 
ADD COLUMN code VARCHAR(50) NULL COMMENT '食谱编号' 
AFTER id;

-- 添加制作软件
ALTER TABLE recipes 
ADD COLUMN software VARCHAR(20) NULL DEFAULT 'ADF' COMMENT '食谱制作软件（ADF/PDD）' 
AFTER recipe_type;

-- 添加营养参考标准
ALTER TABLE recipes 
ADD COLUMN nutrition_standard VARCHAR(20) NULL DEFAULT 'FEDIAF' COMMENT '营养参考标准（NRC/FEDIAF/AAFCO）' 
AFTER software;

-- 添加制作损耗
ALTER TABLE recipes 
ADD COLUMN cooking_loss DECIMAL(5,2) NULL DEFAULT 7.00 COMMENT '制作损耗（%）' 
AFTER nutrition_standard;

-- 添加食谱售价
ALTER TABLE recipes 
ADD COLUMN selling_price DECIMAL(10,2) NULL COMMENT '食谱售价（元）' 
AFTER cooking_loss;

-- 添加营养数据字段
ALTER TABLE recipes 
ADD COLUMN protein DECIMAL(5,2) NULL COMMENT '蛋白质（DM）%' 
AFTER selling_price;

ALTER TABLE recipes 
ADD COLUMN fat DECIMAL(5,2) NULL COMMENT '脂肪（DM）%' 
AFTER protein;

ALTER TABLE recipes 
ADD COLUMN carb DECIMAL(5,2) NULL COMMENT '碳水化合物（DM）%' 
AFTER fat;

ALTER TABLE recipes 
ADD COLUMN fiber DECIMAL(5,2) NULL COMMENT '膳食纤维（DM）%' 
AFTER carb;

ALTER TABLE recipes 
ADD COLUMN ash DECIMAL(5,2) NULL COMMENT '灰分（DM）%' 
AFTER fiber;

ALTER TABLE recipes 
ADD COLUMN moisture DECIMAL(5,2) NULL COMMENT '水分%' 
AFTER ash;

ALTER TABLE recipes 
ADD COLUMN ca_ratio VARCHAR(20) NULL COMMENT '钙磷比（如：1.2:1）' 
AFTER moisture;

ALTER TABLE recipes 
ADD COLUMN total_kcal DECIMAL(10,2) NULL COMMENT '总热量（kcal）' 
AFTER ca_ratio;

ALTER TABLE recipes 
ADD COLUMN total_weight DECIMAL(10,2) NULL COMMENT '总重量（g）' 
AFTER total_kcal;

ALTER TABLE recipes 
ADD COLUMN kcal_density DECIMAL(10,2) NULL COMMENT '热量密度（kcal/kg）' 
AFTER total_weight;

-- 添加审计字段
ALTER TABLE recipes 
ADD COLUMN created_by BIGINT UNSIGNED NULL COMMENT '创建人ID' 
AFTER updated_at;

ALTER TABLE recipes 
ADD COLUMN updated_by BIGINT UNSIGNED NULL COMMENT '更新人ID' 
AFTER created_by;

-- 添加索引（如果不存在会报错，可以忽略）
CREATE INDEX idx_recipes_code ON recipes(code);
CREATE INDEX idx_recipes_life_stage ON recipes(life_stage);
CREATE INDEX idx_recipes_recipe_type ON recipes(recipe_type);
