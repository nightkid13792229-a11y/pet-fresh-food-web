-- 操作日志表
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL COMMENT '操作用户ID',
  action VARCHAR(60) NOT NULL COMMENT '操作类型：login, logout, create_user, update_user, delete_user, enable_user, disable_user, reset_password, create_breed, update_breed, delete_breed等',
  resource_type VARCHAR(60) COMMENT '资源类型：user, breed, order等',
  resource_id BIGINT UNSIGNED COMMENT '资源ID',
  description TEXT COMMENT '操作描述',
  ip_address VARCHAR(45) COMMENT 'IP地址',
  user_agent TEXT COMMENT '用户代理',
  metadata JSON COMMENT '额外数据（JSON格式）',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created_at (created_at),
  CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';


