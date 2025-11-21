-- Seed data for dog_breeds table
-- Based on CKU breed classification with professional data

USE petfresh;

-- 第1组：牧羊犬和牧牛犬
INSERT INTO dog_breeds (category, name, size_category, weight_min, weight_max, maturity_months) VALUES
('第1组：牧羊犬和牧牛犬', '边境牧羊犬', 'medium', 14.00, 20.00, 12),
('第1组：牧羊犬和牧牛犬', '德国牧羊犬', 'large', 22.00, 40.00, 18),
('第1组：牧羊犬和牧牛犬', '比利时牧羊犬', 'medium', 20.00, 30.00, 12),
('第1组：牧羊犬和牧牛犬', '澳洲牧羊犬', 'medium', 18.00, 30.00, 12),
('第1组：牧羊犬和牧牛犬', '柯基犬', 'small', 10.00, 12.00, 12),
('第1组：牧羊犬和牧牛犬', '喜乐蒂牧羊犬', 'medium', 6.00, 12.00, 12),
('第1组：牧羊犬和牧牛犬', '古代英国牧羊犬', 'large', 27.00, 45.00, 18),
('第1组：牧羊犬和牧牛犬', '澳大利亚牧牛犬', 'medium', 16.00, 22.00, 12),
('第1组：牧羊犬和牧牛犬', '弗兰德牧牛犬', 'large', 27.00, 40.00, 18),
('第1组：牧羊犬和牧牛犬', '其他牧羊/牧牛犬', 'medium', 10.00, 30.00, 12)
ON DUPLICATE KEY UPDATE 
  size_category = VALUES(size_category),
  weight_min = VALUES(weight_min),
  weight_max = VALUES(weight_max),
  maturity_months = VALUES(maturity_months);

-- 第2组：平犬和雪纳瑞类
INSERT INTO dog_breeds (category, name, size_category, weight_min, weight_max, maturity_months) VALUES
('第2组：平犬和雪纳瑞类', '雪纳瑞（迷你）', 'small', 4.00, 8.00, 9),
('第2组：平犬和雪纳瑞类', '雪纳瑞（标准）', 'medium', 14.00, 20.00, 12),
('第2组：平犬和雪纳瑞类', '雪纳瑞（巨型）', 'large', 25.00, 35.00, 18),
('第2组：平犬和雪纳瑞类', '斗牛梗', 'medium', 20.00, 25.00, 12),
('第2组：平犬和雪纳瑞类', '波士顿梗', 'small', 5.00, 11.00, 9),
('第2组：平犬和雪纳瑞类', '法国斗牛犬', 'small', 8.00, 14.00, 9),
('第2组：平犬和雪纳瑞类', '英国斗牛犬', 'medium', 18.00, 25.00, 12),
('第2组：平犬和雪纳瑞类', '其他平犬', 'medium', 5.00, 25.00, 12)
ON DUPLICATE KEY UPDATE 
  size_category = VALUES(size_category),
  weight_min = VALUES(weight_min),
  weight_max = VALUES(weight_max),
  maturity_months = VALUES(maturity_months);

-- 第2组：獒犬类和瑞士山地犬
INSERT INTO dog_breeds (category, name, size_category, weight_min, weight_max, maturity_months) VALUES
('第2组：獒犬类和瑞士山地犬', '金毛寻回犬', 'large', 25.00, 34.00, 18),
('第2组：獒犬类和瑞士山地犬', '拉布拉多寻回犬', 'large', 25.00, 36.00, 18),
('第2组：獒犬类和瑞士山地犬', '罗威纳犬', 'large', 35.00, 50.00, 18),
('第2组：獒犬类和瑞士山地犬', '圣伯纳犬', 'xlarge', 50.00, 90.00, 21),
('第2组：獒犬类和瑞士山地犬', '大丹犬', 'xlarge', 45.00, 90.00, 21),
('第2组：獒犬类和瑞士山地犬', '拳师犬', 'large', 25.00, 32.00, 18),
('第2组：獒犬类和瑞士山地犬', '杜宾犬', 'large', 30.00, 40.00, 18),
('第2组：獒犬类和瑞士山地犬', '马士提夫獒犬', 'xlarge', 50.00, 100.00, 21),
('第2组：獒犬类和瑞士山地犬', '其他獒犬', 'large', 25.00, 80.00, 18)
ON DUPLICATE KEY UPDATE 
  size_category = VALUES(size_category),
  weight_min = VALUES(weight_min),
  weight_max = VALUES(weight_max),
  maturity_months = VALUES(maturity_months);

-- 第3组：梗犬类
INSERT INTO dog_breeds (category, name, size_category, weight_min, weight_max, maturity_months) VALUES
('第3组：梗犬类', '约克夏梗', 'small', 2.00, 3.00, 9),
('第3组：梗犬类', '杰克罗素梗', 'small', 5.00, 8.00, 9),
('第3组：梗犬类', '西高地白梗', 'small', 6.00, 10.00, 9),
('第3组：梗犬类', '苏格兰梗', 'small', 8.00, 10.00, 9),
('第3组：梗犬类', '凯利蓝梗', 'medium', 14.00, 18.00, 12),
('第3组：梗犬类', '牛头梗', 'medium', 20.00, 30.00, 12),
('第3组：梗犬类', '贝林顿梗', 'small', 8.00, 10.00, 9),
('第3组：梗犬类', '其他梗犬', 'small', 2.00, 30.00, 9)
ON DUPLICATE KEY UPDATE 
  size_category = VALUES(size_category),
  weight_min = VALUES(weight_min),
  weight_max = VALUES(weight_max),
  maturity_months = VALUES(maturity_months);

-- 第4组：腊肠犬类
INSERT INTO dog_breeds (category, name, size_category, weight_min, weight_max, maturity_months) VALUES
('第4组：腊肠犬类', '短毛腊肠犬', 'small', 7.00, 15.00, 9),
('第4组：腊肠犬类', '长毛腊肠犬', 'small', 7.00, 15.00, 9),
('第4组：腊肠犬类', '刚毛腊肠犬', 'small', 7.00, 15.00, 9)
ON DUPLICATE KEY UPDATE 
  size_category = VALUES(size_category),
  weight_min = VALUES(weight_min),
  weight_max = VALUES(weight_max),
  maturity_months = VALUES(maturity_months);

-- 第5组：原始犬种和雪橇犬
INSERT INTO dog_breeds (category, name, size_category, weight_min, weight_max, maturity_months) VALUES
('第5组：原始犬种和雪橇犬', '哈士奇', 'medium', 16.00, 27.00, 12),
('第5组：原始犬种和雪橇犬', '阿拉斯加雪橇犬', 'large', 34.00, 38.00, 18),
('第5组：原始犬种和雪橇犬', '萨摩耶犬', 'medium', 16.00, 30.00, 12),
('第5组：原始犬种和雪橇犬', '松狮犬', 'medium', 20.00, 32.00, 12),
('第5组：原始犬种和雪橇犬', '柴犬', 'small', 8.00, 11.00, 9),
('第5组：原始犬种和雪橇犬', '秋田犬', 'large', 30.00, 50.00, 18),
('第5组：原始犬种和雪橇犬', '其他原始/雪橇犬', 'medium', 8.00, 50.00, 12)
ON DUPLICATE KEY UPDATE 
  size_category = VALUES(size_category),
  weight_min = VALUES(weight_min),
  weight_max = VALUES(weight_max),
  maturity_months = VALUES(maturity_months);

-- 第6组：嗅觉猎犬类
INSERT INTO dog_breeds (category, name, size_category, weight_min, weight_max, maturity_months) VALUES
('第6组：嗅觉猎犬类', '比格犬', 'small', 8.00, 14.00, 9),
('第6组：嗅觉猎犬类', '巴吉度猎犬', 'medium', 18.00, 27.00, 12),
('第6组：嗅觉猎犬类', '寻血猎犬', 'large', 36.00, 50.00, 18),
('第6组：嗅觉猎犬类', '其他嗅觉猎犬', 'medium', 8.00, 50.00, 12)
ON DUPLICATE KEY UPDATE 
  size_category = VALUES(size_category),
  weight_min = VALUES(weight_min),
  weight_max = VALUES(weight_max),
  maturity_months = VALUES(maturity_months);

-- 第7组：指示犬类
INSERT INTO dog_breeds (category, name, size_category, weight_min, weight_max, maturity_months) VALUES
('第7组：指示犬类', '德国短毛指示犬', 'large', 20.00, 32.00, 18),
('第7组：指示犬类', '英国指示犬', 'large', 20.00, 30.00, 18),
('第7组：指示犬类', '威玛猎犬', 'large', 25.00, 40.00, 18),
('第7组：指示犬类', '其他指示犬', 'large', 20.00, 40.00, 18)
ON DUPLICATE KEY UPDATE 
  size_category = VALUES(size_category),
  weight_min = VALUES(weight_min),
  weight_max = VALUES(weight_max),
  maturity_months = VALUES(maturity_months);

-- 第8组：寻回犬、激飞犬和水猎犬
INSERT INTO dog_breeds (category, name, size_category, weight_min, weight_max, maturity_months) VALUES
('第8组：寻回犬、激飞犬和水猎犬', '金毛寻回犬', 'large', 25.00, 34.00, 18),
('第8组：寻回犬、激飞犬和水猎犬', '拉布拉多寻回犬', 'large', 25.00, 36.00, 18),
('第8组：寻回犬、激飞犬和水猎犬', '可卡犬', 'small', 9.00, 11.00, 9),
('第8组：寻回犬、激飞犬和水猎犬', '英国激飞犬', 'medium', 18.00, 25.00, 12),
('第8组：寻回犬、激飞犬和水猎犬', '其他寻回/激飞犬', 'medium', 9.00, 36.00, 12)
ON DUPLICATE KEY UPDATE 
  size_category = VALUES(size_category),
  weight_min = VALUES(weight_min),
  weight_max = VALUES(weight_max),
  maturity_months = VALUES(maturity_months);

-- 第9组：伴侣犬和玩具犬
INSERT INTO dog_breeds (category, name, size_category, weight_min, weight_max, maturity_months) VALUES
('第9组：伴侣犬和玩具犬', '贵宾犬（玩具）', 'small', 2.00, 4.00, 9),
('第9组：伴侣犬和玩具犬', '贵宾犬（迷你）', 'small', 4.00, 6.00, 9),
('第9组：伴侣犬和玩具犬', '贵宾犬（标准）', 'medium', 20.00, 32.00, 12),
('第9组：伴侣犬和玩具犬', '比熊犬', 'small', 3.00, 6.00, 9),
('第9组：伴侣犬和玩具犬', '马尔济斯', 'small', 2.00, 4.00, 9),
('第9组：伴侣犬和玩具犬', '博美犬', 'small', 1.50, 3.00, 9),
('第9组：伴侣犬和玩具犬', '吉娃娃', 'small', 1.00, 3.00, 9),
('第9组：伴侣犬和玩具犬', '北京犬', 'small', 3.00, 6.00, 9),
('第9组：伴侣犬和玩具犬', '西施犬', 'small', 4.00, 7.00, 9),
('第9组：伴侣犬和玩具犬', '巴哥犬', 'small', 6.00, 8.00, 9),
('第9组：伴侣犬和玩具犬', '其他伴侣/玩具犬', 'small', 1.00, 8.00, 9)
ON DUPLICATE KEY UPDATE 
  size_category = VALUES(size_category),
  weight_min = VALUES(weight_min),
  weight_max = VALUES(weight_max),
  maturity_months = VALUES(maturity_months);

-- 第10组：视觉猎犬类
INSERT INTO dog_breeds (category, name, size_category, weight_min, weight_max, maturity_months) VALUES
('第10组：视觉猎犬类', '灵缇犬', 'large', 27.00, 32.00, 18),
('第10组：视觉猎犬类', '惠比特犬', 'medium', 10.00, 15.00, 12),
('第10组：视觉猎犬类', '阿富汗猎犬', 'large', 23.00, 27.00, 18),
('第10组：视觉猎犬类', '萨路基猎犬', 'large', 20.00, 30.00, 18),
('第10组：视觉猎犬类', '其他视觉猎犬', 'medium', 10.00, 32.00, 12)
ON DUPLICATE KEY UPDATE 
  size_category = VALUES(size_category),
  weight_min = VALUES(weight_min),
  weight_max = VALUES(weight_max),
  maturity_months = VALUES(maturity_months);

-- 其他/混血犬
INSERT INTO dog_breeds (category, name, size_category, weight_min, weight_max, maturity_months) VALUES
('其他/混血犬', '混血犬', 'medium', 5.00, 40.00, 12),
('其他/混血犬', '其他未分类犬种', 'medium', 5.00, 40.00, 12)
ON DUPLICATE KEY UPDATE 
  size_category = VALUES(size_category),
  weight_min = VALUES(weight_min),
  weight_max = VALUES(weight_max),
  maturity_months = VALUES(maturity_months);


