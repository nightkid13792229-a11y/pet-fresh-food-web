-- 添加联系方式字段到 users 表
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS contact_info VARCHAR(60) COMMENT '联系方式（微信号或手机号）';


