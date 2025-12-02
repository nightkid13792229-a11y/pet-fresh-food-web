# 食谱数据库表结构迁移总结

## 执行时间
2024-12-02

## 迁移内容

### 1. recipes 表扩展
已成功添加以下字段：
- `code` VARCHAR(50) - 食谱编号
- `software` VARCHAR(20) DEFAULT 'ADF' - 制作软件（ADF/PDD）
- `nutrition_standard` VARCHAR(20) DEFAULT 'FEDIAF' - 营养参考标准（NRC/FEDIAF/AAFCO）
- `cooking_loss` DECIMAL(5,2) DEFAULT 7.00 - 制作损耗（%）
- `selling_price` DECIMAL(10,2) - 食谱售价（元）
- `protein` DECIMAL(5,2) - 蛋白质（DM）%
- `fat` DECIMAL(5,2) - 脂肪（DM）%
- `carb` DECIMAL(5,2) - 碳水化合物（DM）%
- `fiber` DECIMAL(5,2) - 膳食纤维（DM）%
- `ash` DECIMAL(5,2) - 灰分（DM）%
- `moisture` DECIMAL(5,2) - 水分%
- `ca_ratio` VARCHAR(20) - 钙磷比（如：1.2:1）
- `total_kcal` DECIMAL(10,2) - 总热量（kcal）
- `total_weight` DECIMAL(10,2) - 总重量（g）
- `kcal_density` DECIMAL(10,2) - 热量密度（kcal/kg）
- `created_by` BIGINT UNSIGNED - 创建人ID
- `updated_by` BIGINT UNSIGNED - 更新人ID

已添加索引：
- `idx_recipes_code` - 食谱编号索引
- `idx_recipes_life_stage` - 生命阶段索引
- `idx_recipes_recipe_type` - 食谱类型索引

### 2. recipe_ingredients 表更新
已成功添加以下字段：
- `ingredient_id` BIGINT UNSIGNED - 原料ID（关联ingredients表）
- `weight` DECIMAL(10,3) - 重量（g）

注意：`unit` 字段已存在，迁移时出现重复字段错误，可忽略。

已添加索引：
- `idx_recipe_ingredients_recipe_id` - 食谱ID索引
- `idx_recipe_ingredients_ingredient_id` - 原料ID索引

### 3. recipe_cooking_steps 表创建
已成功创建新表，包含以下字段：
- `id` BIGINT UNSIGNED - 主键
- `recipe_id` BIGINT UNSIGNED - 食谱ID（外键关联recipes表）
- `step_order` INT UNSIGNED DEFAULT 1 - 步骤顺序
- `description` TEXT - 步骤描述
- `created_at` TIMESTAMP - 创建时间
- `updated_at` TIMESTAMP - 更新时间

已添加索引：
- `idx_recipe_cooking_steps_recipe_id` - 食谱ID索引
- `idx_recipe_cooking_steps_order` - 步骤顺序索引

已添加外键约束：
- `fk_recipe_cooking_steps_recipe` - 关联recipes表，级联删除

## 表结构关系

```
recipes (1) ──< (N) recipe_ingredients
recipes (1) ──< (N) recipe_cooking_steps
ingredients (1) ──< (N) recipe_ingredients
```

## 下一步
- 阶段2：后端API开发（CRUD功能）
- 阶段3：前端对接后端
- 阶段4：功能完善

