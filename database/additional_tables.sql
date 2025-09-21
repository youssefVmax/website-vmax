USE vmax;
SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Settings table for application configuration
CREATE TABLE IF NOT EXISTS `settings` (
  `id` VARCHAR(191) NOT NULL,
  `setting_key` VARCHAR(191) NOT NULL,
  `setting_value` TEXT NULL,
  `setting_type` ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  `description` TEXT NULL,
  `created_by` VARCHAR(191) NULL,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity log table for audit trail
CREATE TABLE IF NOT EXISTS `activity_log` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NULL,
  `action` VARCHAR(191) NOT NULL,
  `entity_type` VARCHAR(191) NOT NULL,
  `entity_id` VARCHAR(191) NULL,
  `old_values` JSON NULL,
  `new_values` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `created_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_action` (`action`),
  INDEX `idx_entity_type` (`entity_type`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User sessions table for login tracking
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `session_token` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `login_time` DATETIME NULL,
  `last_activity` DATETIME NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `expires_at` DATETIME NULL,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_session_token` (`session_token`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_is_active` (`is_active`),
  INDEX `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Deal history table for tracking deal changes
CREATE TABLE IF NOT EXISTS `deal_history` (
  `id` VARCHAR(191) NOT NULL,
  `deal_id` VARCHAR(191) NOT NULL,
  `changed_by` VARCHAR(191) NULL,
  `change_type` VARCHAR(50) NOT NULL,
  `old_stage` VARCHAR(191) NULL,
  `new_stage` VARCHAR(191) NULL,
  `old_amount` BIGINT NULL,
  `new_amount` BIGINT NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_deal_id` (`deal_id`),
  INDEX `idx_changed_by` (`changed_by`),
  INDEX `idx_change_type` (`change_type`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Callback history table for tracking callback changes
CREATE TABLE IF NOT EXISTS `callback_history` (
  `id` VARCHAR(191) NOT NULL,
  `callback_id` VARCHAR(191) NOT NULL,
  `changed_by` VARCHAR(191) NULL,
  `change_type` VARCHAR(50) NOT NULL,
  `old_status` VARCHAR(191) NULL,
  `new_status` VARCHAR(191) NULL,
  `old_scheduled_date` DATE NULL,
  `new_scheduled_date` DATE NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_callback_id` (`callback_id`),
  INDEX `idx_changed_by` (`changed_by`),
  INDEX `idx_change_type` (`change_type`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Team performance metrics table
CREATE TABLE IF NOT EXISTS `team_metrics` (
  `id` VARCHAR(191) NOT NULL,
  `team_name` VARCHAR(191) NOT NULL,
  `period` VARCHAR(191) NOT NULL,
  `total_deals` BIGINT DEFAULT 0,
  `total_revenue` BIGINT DEFAULT 0,
  `total_callbacks` BIGINT DEFAULT 0,
  `completed_callbacks` BIGINT DEFAULT 0,
  `team_target` BIGINT DEFAULT 0,
  `target_achievement` DOUBLE DEFAULT 0,
  `avg_deal_value` DOUBLE DEFAULT 0,
  `conversion_rate` DOUBLE DEFAULT 0,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_team_period` (`team_name`, `period`),
  INDEX `idx_team_name` (`team_name`),
  INDEX `idx_period` (`period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings
INSERT IGNORE INTO `settings` (`id`, `setting_key`, `setting_value`, `setting_type`, `description`, `created_by`, `created_at`, `updated_at`) VALUES
('set_001', 'company_name', 'VMAX Sales System', 'string', 'Company name displayed in the application', 'system', NOW(), NOW()),
('set_002', 'default_currency', 'USD', 'string', 'Default currency for deals and targets', 'system', NOW(), NOW()),
('set_003', 'notification_retention_days', '30', 'number', 'Number of days to keep notifications', 'system', NOW(), NOW()),
('set_004', 'auto_backup_enabled', 'true', 'boolean', 'Enable automatic database backups', 'system', NOW(), NOW()),
('set_005', 'max_login_attempts', '5', 'number', 'Maximum login attempts before account lockout', 'system', NOW(), NOW()),
('set_006', 'session_timeout', '3600', 'number', 'Session timeout in seconds', 'system', NOW(), NOW()),
('set_007', 'enable_audit_log', 'true', 'boolean', 'Enable activity logging for audit trail', 'system', NOW(), NOW());

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS `idx_deals_sales_agent` ON `deals`(`SalesAgentID`);
CREATE INDEX IF NOT EXISTS `idx_deals_sales_team` ON `deals`(`sales_team`);
CREATE INDEX IF NOT EXISTS `idx_deals_stage` ON `deals`(`stage`);
CREATE INDEX IF NOT EXISTS `idx_deals_status` ON `deals`(`status`);
CREATE INDEX IF NOT EXISTS `idx_deals_created_at` ON `deals`(`created_at`);
CREATE INDEX IF NOT EXISTS `idx_deals_signup_date` ON `deals`(`signup_date`);
CREATE INDEX IF NOT EXISTS `idx_deals_amount` ON `deals`(`amount_paid`);

CREATE INDEX IF NOT EXISTS `idx_callbacks_sales_agent` ON `callbacks`(`SalesAgentID`);
CREATE INDEX IF NOT EXISTS `idx_callbacks_sales_team` ON `callbacks`(`sales_team`);
CREATE INDEX IF NOT EXISTS `idx_callbacks_status` ON `callbacks`(`status`);
CREATE INDEX IF NOT EXISTS `idx_callbacks_priority` ON `callbacks`(`priority`);
CREATE INDEX IF NOT EXISTS `idx_callbacks_scheduled_date` ON `callbacks`(`scheduled_date`);
CREATE INDEX IF NOT EXISTS `idx_callbacks_created_at` ON `callbacks`(`created_at`);

CREATE INDEX IF NOT EXISTS `idx_users_username` ON `users`(`username`);
CREATE INDEX IF NOT EXISTS `idx_users_email` ON `users`(`email`);
CREATE INDEX IF NOT EXISTS `idx_users_role` ON `users`(`role`);
CREATE INDEX IF NOT EXISTS `idx_users_team` ON `users`(`team`);

CREATE INDEX IF NOT EXISTS `idx_targets_agent` ON `targets`(`agentId`);
CREATE INDEX IF NOT EXISTS `idx_targets_manager` ON `targets`(`managerId`);
CREATE INDEX IF NOT EXISTS `idx_targets_period` ON `targets`(`period`);

CREATE INDEX IF NOT EXISTS `idx_notifications_timestamp` ON `notifications`(`timestamp`);
CREATE INDEX IF NOT EXISTS `idx_notifications_is_read` ON `notifications`(`isRead`);
CREATE INDEX IF NOT EXISTS `idx_notifications_type` ON `notifications`(`type`);
CREATE INDEX IF NOT EXISTS `idx_notifications_sales_agent` ON `notifications`(`salesAgentId`);

COMMIT;
